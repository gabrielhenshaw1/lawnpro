import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// --- HELPERS ---
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeatherIcon(code) {
  if (code === 0) return '☀️'; 
  if (code >= 1 && code <= 3) return '⛅'; 
  if (code >= 51 && code <= 55) return '💧'; 
  if (code >= 61 && code <= 67) return '🌧️'; 
  if (code >= 71 && code <= 77) return '❄️'; 
  if (code >= 95) return '⛈️'; 
  return '☁️'; 
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
                {getWeatherIcon(current.weather_code) === '☀️' ? 'Clear Skies' : 'Cloudy/Rain'}
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
function CalendarGrid({ bookings, forecastDays }) {
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
             <div key={day.toString()} className={`h-32 p-2 border border-gray-100 flex flex-col transition-colors relative ${isToday ? 'bg-blue-50 border-blue-200' : isPast ? 'bg-gray-50' : 'bg-white hover:bg-gray-100'}`}>
                <span className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-700' : isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                  {day.getDate()}
                </span>
                {forecast && (
                    <div className={`absolute top-0 right-0 p-1 text-xs font-semibold rounded-bl-lg ${getWeatherColor(forecast.weather_code)}`}>
                        {getWeatherIcon(forecast.weather_code)} {Math.round(forecast.temperature_2m_max)}°
                    </div>
                )}
                <div className="flex-1 overflow-y-auto space-y-1 pt-4 custom-scrollbar">
                  {dayBookings.map(b => (
                    <div key={b.id} className="bg-green-100 text-green-800 text-[10px] p-1 rounded truncate border border-green-200 font-medium" title={`${b.service} (${b.customerName})`}>
                      {b.requestedTimeSlot || 'TBD'} - {b.service}
                    </div>
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
         const confirmedQuery = query(collection(db, "bookings"), where("proId", "==", user.uid), where("status", "==", "confirmed"));
         const unsubscribeBookings = onSnapshot(confirmedQuery, (snapshot) => {
           const list = [];
           snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
           setBookings(list);
           setLoading(false);
         });

         const pendingQuery = query(collection(db, "bookings"), where("proId", "==", user.uid), where("status", "in", ["pending", "quote_received"]));
         const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
           setPendingCount(snapshot.size);
         });

         return () => {
            unsubscribeBookings();
            unsubscribePending();
         };
      } else {
         setLoading(false);
      }
    });

    // Fetch Weather
    const fetchWeather = async () => {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.69&longitude=-87.91&current=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,weather_code,precipitation_probability_max&timezone=America%2FChicago&forecast_days=14&temperature_unit=fahrenheit');
            if (!res.ok) throw new Error("Weather API error");
            const data = await res.json();
            setForecast(data);
        } catch (e) {
            console.error("Weather fetch failed:", e);
            setWeatherError(true);
        }
    };
    fetchWeather();

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="space-y-6">
      <WeatherWidget forecast={forecast} error={weatherError} />
      {loading ? <p className="text-center p-8">Loading dashboard...</p> : <CalendarGrid bookings={bookings} forecastDays={forecast} />}
      
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex justify-between items-center shadow-md">
         <div>
            <h3 className="font-bold text-blue-900 text-lg">New Requests to Review</h3>
            <p className="text-blue-700 text-sm">You have <span className="font-bold">{pendingCount}</span> request(s) or quotes waiting.</p>
         </div>
         <button 
            onClick={() => onNavigate('Requests')} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm"
          >
            Review Requests ({pendingCount}) →
         </button>
      </div>
    </div>
  );
}