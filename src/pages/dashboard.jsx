import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendStatusEmail } from '../utils/notifications.js';

// --- HELPERS ---
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeatherIcon(code) {
  if (code === 0) return ' ☀️ ';
  if (code >= 1 && code <= 3) return ' ⛅ ';
  if (code >= 51 && code <= 55) return ' 💧 ';
  if (code >= 61 && code <= 67) return ' 🌧️ ';
  if (code >= 71 && code <= 77) return ' ❄️ ';
  if (code >= 95) return ' ⛈️ ';
  return ' ☁️ ';
}

function getWeatherColor(code) {
  if (code === 0) return 'bg-yellow-50 text-yellow-700';
  if (code >= 51 && code <= 67) return 'bg-blue-100 text-blue-700';
  if (code >= 71 && code <= 77) return 'bg-gray-200 text-gray-800';
  if (code >= 95) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

// --- WEATHER WIDGET ---
function WeatherWidget({ forecast, error }) {
  if (error) return <div className="p-4 bg-red-50 rounded-lg text-red-600 border border-red-100">Weather currently unavailable.</div>;
  if (!forecast || !forecast.current) return <div className="p-4 bg-gray-100 rounded-lg text-gray-500 animate-pulse">Loading weather data...</div>;
  const current = forecast.current;
  const precipChance = forecast.daily?.precipitation_probability_max?.[0] || 0;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white p-6 flex justify-between items-center shadow-lg">
      <div>
        <h3 className="font-bold opacity-90 text-sm uppercase tracking-wider">Morganfield, KY Weather</h3>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-5xl">{getWeatherIcon(current.weather_code)}</span>
          <div>
            <p className="text-4xl font-bold">{Math.round(current.temperature_2m)}°F</p>
            <p className="text-blue-100 font-medium">
              {getWeatherIcon(current.weather_code) === ' ☀️ ' ? 'Clear Skies' : 'Cloudy/Rain'}
            </p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
          <p className="text-xs opacity-80 uppercase font-bold">Rain Risk Today</p>
          <p className="text-2xl font-bold">{precipChance}%</p>
        </div>
      </div>
    </div>
  );
}

// --- CALENDAR GRID ---
function CalendarGrid({ bookings, forecastDays, onJobClick }) {
  const getCalendarDays = () => {
    const today = new Date();
    const days = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());
    for (let i = 0; i < 35; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };
  const calendarDays = getCalendarDays();
  const today = new Date();
  
  const getBookingsForDay = (day) => {
    return bookings.filter(b => {
      const dateSource = b.scheduledDate || b.requestedDate; 
      const d = dateSource && dateSource.seconds ? new Date(dateSource.seconds * 1000) : new Date(dateSource);
      if (!d || isNaN(d.getTime())) return false;
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">30-Day Schedule Overview</h2>
      <div className="grid grid-cols-7 gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
        {DAY_NAMES.map(d => (
          <div key={d} className="bg-gray-200 p-2 text-center font-bold text-xs text-gray-600 uppercase">{d}</div>
        ))}
        {calendarDays.map((day, index) => {
          const dayBookings = getBookingsForDay(day);
          const isToday = day.toDateString() === today.toDateString();
          const isPast = day < today && !isToday;
          const forecastIndex = index;
          const hasForecast = forecastDays?.daily?.time?.[forecastIndex];
          const forecast = hasForecast ? {
            weather_code: forecastDays.daily.weather_code[forecastIndex],
            temperature_2m_max: forecastDays.daily.temperature_2m_max[forecastIndex]
          } : null;

          return (
            <div key={day.toString()} className={`min-h-[100px] p-2 border border-gray-100 flex flex-col transition-colors relative ${isToday ? 'bg-blue-50 border-blue-200' : isPast ? 'bg-gray-50' : 'bg-white hover:bg-gray-100'}`}>
              <span className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-700' : isPast ? 'text-gray-400' : 'text-gray-900'}`}>{day.getDate()}</span>
              {forecast && (
                <div className={`absolute top-0 right-0 p-1 text-[10px] font-semibold rounded-bl-lg ${getWeatherColor(forecast.weather_code)}`}>
                  {getWeatherIcon(forecast.weather_code)} {Math.round(forecast.temperature_2m_max)}°
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-1 pt-4 custom-scrollbar">
                {dayBookings.map(b => (
                  <button 
                    key={b.id} 
                    onClick={() => onJobClick(b)}
                    className="w-full text-left bg-green-100 text-green-800 text-[10px] p-1 rounded truncate border border-green-200 font-medium hover:bg-green-200 hover:scale-105 transition-all" 
                    title={`${b.service} (${b.customerName})`}
                  >
                    {b.requestedTimeSlot || 'TBD'} - {b.service}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * MAIN DASHBOARD EXPORT
 */
export default function DashboardPage({ onNavigate }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // JOB DETAIL MODAL STATE
  const [selectedJob, setSelectedJob] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  // COMPLETION STATE
  const [isCompleting, setIsCompleting] = useState(false);
  const [finalBillAmount, setFinalBillAmount] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch ALL Confirmed/Scheduled jobs for the calendar
        const confirmedQuery = query(collection(db, "bookings"), where("proId", "==", user.uid), where("status", "in", ["confirmed", "scheduled"]));
        const unsubscribeBookings = onSnapshot(confirmedQuery, (snapshot) => {
          const list = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          setBookings(list);
          setLoading(false);
        });
        
        // Count Pending
        const pendingQuery = query(collection(db, "bookings"), where("proId", "==", user.uid), where("status", "in", ["pending", "quote_received", "reschedule_pending_provider"]));
        const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => setPendingCount(snapshot.size));
        
        return () => { unsubscribeBookings(); unsubscribePending(); };
      } else { setLoading(false); }
    });

    // Fetch Weather
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.69&longitude=-87.91&current=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,weather_code,precipitation_probability_max&timezone=America%2FChicago&forecast_days=14&temperature_unit=fahrenheit');
        if (!res.ok) throw new Error("Weather API error");
        const data = await res.json();
        setForecast(data);
      } catch (e) { console.error("Weather fetch failed:", e); setWeatherError(true); }
    };
    fetchWeather();
    return () => unsubscribeAuth();
  }, []);

  // --- ACTIONS ---
  const handleCancelJob = async () => {
    if (!window.confirm(`Are you sure you want to CANCEL ${selectedJob.service} for ${selectedJob.customerName}?`)) return;
    try {
      await updateDoc(doc(db, "bookings", selectedJob.id), { status: "cancelled" });
      await sendStatusEmail(selectedJob.customerEmail, "cancelled", "http://localhost:5173/customer");
      setSelectedJob(null);
      alert("Job cancelled.");
    } catch (e) { console.error(e); }
  };

  const handleProposeReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) return alert("Select new date and time.");
    try {
      await updateDoc(doc(db, "bookings", selectedJob.id), {
        status: "reschedule_pending_customer",
        proposedDate: new Date(rescheduleData.date),
        proposedTime: rescheduleData.time,
        rescheduleInitiator: 'provider'
      });
      // Notify Customer
      await sendStatusEmail(selectedJob.customerEmail, "reschedule_proposal", "http://localhost:5173/customer");
      setSelectedJob(null);
      setIsRescheduling(false);
      alert("Reschedule proposal sent to customer.");
    } catch (e) { console.error(e); }
  };

  const handleCompleteJob = async () => {
    const bill = parseFloat(finalBillAmount);
    if (isNaN(bill) || bill < 0) return alert("Please enter a valid bill amount.");

    try {
      await updateDoc(doc(db, "bookings", selectedJob.id), {
        status: "completed",
        finalBillAmount: bill,
        completedAt: new Date()
      });
      // Optionally notify user here if desired, or just silent update
      alert("Job marked as completed! Revenue recorded.");
      setSelectedJob(null);
      setIsCompleting(false);
    } catch (e) {
      console.error(e);
      alert("Error completing job.");
    }
  };

  const openCompletion = () => {
    // Pre-fill with quote amount if available
    setFinalBillAmount(selectedJob.quoteAmount || '');
    setIsCompleting(true);
    setIsRescheduling(false);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedJob.service}</h3>
                <p className="text-sm text-green-600 font-medium">{selectedJob.status.toUpperCase()}</p>
              </div>
              <button onClick={() => { setSelectedJob(null); setIsRescheduling(false); setIsCompleting(false); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                <p className="font-medium text-gray-800">{selectedJob.customerName}</p>
                <p className="text-sm text-gray-500">{selectedJob.customerEmail}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                <p className="text-gray-700">{selectedJob.address}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Scheduled For</label>
                <p className="text-gray-800 font-bold text-lg">
                  {selectedJob.scheduledDate ? new Date(selectedJob.scheduledDate.seconds * 1000).toLocaleDateString() : new Date(selectedJob.requestedDate.seconds * 1000).toLocaleDateString()}
                  <span className="ml-2 font-normal text-gray-500">at {selectedJob.requestedTimeSlot}</span>
                </p>
              </div>

              {/* RESCHEDULE FORM */}
              {isRescheduling && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4 animate-fadeIn">
                  <p className="text-xs font-bold text-blue-800 uppercase mb-2">Propose New Time</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input type="date" className="p-2 border rounded text-sm" onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
                    <select className="p-2 border rounded text-sm" onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})}>
                      <option value="">Time</option>
                      {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <button onClick={handleProposeReschedule} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Send Proposal</button>
                </div>
              )}

              {/* COMPLETION FORM */}
              {isCompleting && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 mt-4 animate-fadeIn">
                  <p className="text-xs font-bold text-green-800 uppercase mb-2">Finalize Job</p>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">Final Bill Amount ($)</label>
                    <input 
                      type="number" 
                      value={finalBillAmount} 
                      onChange={e => setFinalBillAmount(e.target.value)} 
                      className="w-full p-2 border border-green-200 rounded text-lg font-bold text-green-700" 
                      placeholder="0.00"
                    />
                  </div>
                  <button onClick={handleCompleteJob} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Confirm Completion</button>
                </div>
              )}
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex gap-3">
              {!isRescheduling && !isCompleting ? (
                <>
                  <button onClick={openCompletion} className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-sm">
                    Complete Job
                  </button>
                  <button onClick={() => setIsRescheduling(true)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-100">
                    Reschedule
                  </button>
                  <button onClick={handleCancelJob} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-2 rounded font-bold hover:bg-red-100">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => { setIsRescheduling(false); setIsCompleting(false); }} className="w-full text-gray-500 py-2 hover:underline text-sm">
                  ← Back to Options
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <WeatherWidget forecast={forecast} error={weatherError} />
      {loading ? <p className="text-center p-8">Loading dashboard...</p> : <CalendarGrid bookings={bookings} forecastDays={forecast} onJobClick={setSelectedJob} />}

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex justify-between items-center shadow-md">
        <div>
          <h3 className="font-bold text-blue-900 text-lg">New Requests</h3>
          <p className="text-blue-700 text-sm">You have <span className="font-bold">{pendingCount}</span> items to review.</p>
        </div>
        <button onClick={() => onNavigate('Requests')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm">Review Requests →</button>
      </div>
    </div>
  );
}