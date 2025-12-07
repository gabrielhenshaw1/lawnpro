import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js';
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';
import { sendStatusEmail } from '../utils/notifications.js';

// --- DATA: SERVICE LIST ---
const SERVICES = [
  { category: "Lawn Care", id: "mowing", title: "Mowing & Trimming", price: "$50 / acre", desc: "Standard cut, trim, and edge for a clean finish." },
  { category: "Lawn Care", id: "weed_control", title: "Weed Control", price: "$60 / acre", desc: "Targeted or full-lawn weed treatment." },
  { category: "Lawn Care", id: "fertilization", title: "Fertilization", price: "$60 / acre", desc: "Granular or liquid fertilizer applied evenly." },
  { category: "Lawn Care", id: "aeration", title: "Aeration", price: "$100 / acre", desc: "Core aeration to relieve compaction and promote root growth." },
  { category: "Lawn Care", id: "overseeding", title: "Overseeding", price: "$60 / acre", desc: "Grass seed applied (labor only)." },
  { category: "Lawn Care", id: "dethatching", title: "Dethatching", price: "$120 / acre", desc: "Removes built-up thatch; very labor intensive." },
  { category: "Lawn Care", id: "leaf_removal", title: "Leaf Removal", price: "$50 / acre", desc: "Light-to-moderate leaf cleanup." },
  { category: "Lawn Care", id: "disease_treatment", title: "Lawn Disease / Insect Treatment", price: "$60 / acre", desc: "Applies fungicide or insect control (chemical cost separate)." },
  { category: "Gardening", id: "mulching", title: "Mulching (Install Only)", price: "$160 / acre (bed area)", desc: "Spreads mulch evenly in beds." },
  { category: "Gardening", id: "bed_creation", title: "Garden Bed Creation", price: "$200 / acre", desc: "Cuts out grass, shapes bed, prepares soil." },
  { category: "Gardening", id: "planting", title: "Planting / Transplanting", price: "$5-$10 / plant", desc: "Installs flowers, shrubs, or small plants." },
  { category: "Gardening", id: "pruning", title: "Shrub or Small Tree Pruning", price: "$100 / acre", desc: "Shapes bushes and trims small trees." },
  { category: "Gardening", id: "weeding", title: "Flower Bed Weeding", price: "$60 / acre", desc: "Manual or light tool weeding." },
  { category: "Gardening", id: "soil_conditioning", title: "Soil Conditioning", price: "$100 / acre", desc: "Mixes in compost or amendments." },
  { category: "Cleanup", id: "spring_cleanup", title: "Spring Cleanup", price: "$100 / acre", desc: "Debris removal, prune, bed refresh." },
  { category: "Cleanup", id: "fall_cleanup", title: "Fall Cleanup", price: "$100 / acre", desc: "Leaf piles, limbs, debris, final mow." },
  { category: "Cleanup", id: "storm_cleanup", title: "Storm Cleanup (Light)", price: "$60 / acre", desc: "Small limb + debris removal." },
  { category: "Additional", id: "gutter", title: "Gutter Cleaning", price: "$50-$75 flat", desc: "Typical single-story home." },
  { category: "Additional", id: "pressure_wash", title: "Pressure Washing", price: "$5 / 1k sq ft", desc: "Patios, walkways, driveways." },
  { category: "Additional", id: "sod", title: "Sod Installation (Labor Only)", price: "$200 / acre", desc: "Remove old turf + lay new sod." },
  { category: "Additional", id: "gravel", title: "Gravel / Rock Installation", price: "$160 / acre", desc: "Spread gravel or rock evenly." },
  { category: "Additional", id: "fabric", title: "Landscape Fabric Installation", price: "$80 / acre", desc: "Bed prep + fabric install." },
  { category: "Additional", id: "edging", title: "Edging Installation", price: "$2 / linear ft", desc: "Metal, plastic, or stone edging." },
  { category: "Additional", id: "irrigation", title: "Irrigation Check (Basic)", price: "$50 flat", desc: "Sprinkler head alignment & coverage check." },
  { category: "Additional", id: "haul_off", title: "Junk / Brush Haul-Off", price: "$50 / load", desc: "Branches, brush, yard debris per pickup load." },
];

const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * =================================================================
 * COMPONENT: Custom Themed Calendar (Fixed Timezone Logic)
 * =================================================================
 */
function CustomCalendar({ value, onChange, isBlocked }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  // --- SAFE DATE FORMATTER ---
  const formatDateLocal = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDayClick = (date) => {
    if (!date) return;
    onChange(formatDateLocal(date));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">←</button>
        <span className="font-bold text-gray-700">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">→</button>
      </div>
      
      <div className="grid grid-cols-7 text-center mb-2">
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} className="text-xs font-bold text-gray-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => {
          if (!d) return <div key={idx} />; 
          
          const dateStr = formatDateLocal(d);
          const blocked = isBlocked(dateStr);
          const selected = value === dateStr;
          const isPast = d < new Date().setHours(0,0,0,0);

          return (
            <button
              key={idx}
              onClick={() => !blocked && !isPast && handleDayClick(d)}
              disabled={blocked || isPast}
              className={`
                h-8 w-8 text-sm rounded-full flex items-center justify-center transition-colors
                ${selected 
                  ? 'bg-green-600 text-white font-bold shadow-md' 
                  : blocked || isPast 
                    ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700 font-medium'
                }
              `}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * =================================================================
 * BLOCK 1: CustomerDashboard (Home)
 * =================================================================
 */
function DashboardHome({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reschedule State
  const [rescheduleTarget, setRescheduleTarget] = useState(null); 
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("customerEmail", "==", user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => b.requestedDate.seconds - a.requestedDate.seconds);
      setBookings(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCancel = async (id) => {
    if(!window.confirm("Are you sure you want to CANCEL this service?")) return;
    await updateDoc(doc(db, "bookings", id), { status: 'cancelled' });
    // Notify Admin of cancellation
    await sendStatusEmail("provider@lawnpro.com", "cancelled", "", { isToAdmin: true });
  };

  // --- CUSTOMER PROPOSES NEW TIME ---
  const handleSubmitReschedule = async () => {
    if (!newDate || !newTime) return alert("Select date and time.");
    
    // 1. Update DB to flip status to Provider
    await updateDoc(doc(db, "bookings", rescheduleTarget.id), {
      status: 'reschedule_pending_provider',
      proposedDate: new Date(newDate),
      proposedTime: newTime,
      rescheduleInitiator: 'customer'
    });

    // 2. Notify Admin
    await sendStatusEmail("provider@lawnpro.com", "reschedule_proposal", `http://localhost:5173/admin`, {
      isToAdmin: true,
      proposedInfo: `${newDate} at ${newTime}`
    });

    setRescheduleTarget(null);
    alert("Reschedule request sent to provider.");
  };

  // --- CUSTOMER ACCEPTS ADMIN'S TIME ---
  const handleApproveReschedule = async (booking) => {
    await updateDoc(doc(db, "bookings", booking.id), {
      status: 'confirmed',
      scheduledDate: booking.proposedDate,
      requestedTimeSlot: booking.proposedTime, 
      proposedDate: null,
      proposedTime: null
    });
    
    // Notify Admin of acceptance
    await sendStatusEmail("provider@lawnpro.com", "confirmed", `http://localhost:5173/admin`, { isToAdmin: true });
    alert("New time confirmed!");
  };

  const handleAcceptQuote = async (bookingId) => {
    if(!window.confirm("Accept this quote and schedule the service?")) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: 'confirmed' });
      await sendStatusEmail("provider@lawnpro.com", "confirmed", `http://localhost:5173/admin`, { isToAdmin: true }); 
      alert("Quote accepted! Service is now scheduled.");
    } catch (e) { console.error(e); }
  };

  if (loading) return <p className="text-center p-4">Loading services...</p>;

  const active = bookings.filter(b => ['pending', 'quote_received', 'reschedule_pending_provider', 'reschedule_pending_customer'].includes(b.status));
  const upcoming = bookings.filter(b => ['confirmed', 'scheduled'].includes(b.status));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* RESCHEDULE MODAL */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Reschedule Service</h3>
            <p className="mb-4 text-gray-600">Propose a new time for: <strong>{rescheduleTarget.service}</strong></p>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Date</label><input type="date" className="w-full p-2 border rounded" min={new Date().toISOString().split('T')[0]} onChange={e => setNewDate(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Time</label><select className="w-full p-2 border rounded" onChange={e => setNewTime(e.target.value)}><option value="">Select Time</option>{["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setRescheduleTarget(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={handleSubmitReschedule} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Send Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE REQUESTS & RESCHEDULES */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Active / Pending</h2>
        {active.length === 0 ? <p className="text-gray-500 italic">No active requests.</p> : (
          <div className="space-y-4">
            {active.map(b => (
              <div key={b.id} className={`p-6 rounded-lg shadow-sm border ${b.status.includes('reschedule') ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{b.service}</h3>
                    <p className="text-sm text-gray-500">Current: {new Date(b.requestedDate.seconds * 1000).toLocaleDateString()} at {b.requestedTimeSlot}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border shadow-sm">
                    {b.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                {/* Incoming Reschedule Offer (From Admin) */}
                {b.status === 'reschedule_pending_customer' && (
                  <div className="mt-4 bg-white p-4 rounded border border-orange-200">
                    <p className="text-sm font-bold text-orange-800">Provider Proposed New Time:</p>
                    <p className="text-lg font-bold text-gray-800 my-1">{new Date(b.proposedDate.seconds * 1000).toLocaleDateString()} @ {b.proposedTime}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApproveReschedule(b)} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">Accept New Time</button>
                      <button onClick={() => setRescheduleTarget(b)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold hover:bg-gray-50">Propose Alternative</button>
                      <button onClick={() => handleCancel(b.id)} className="text-red-500 px-4 py-2 text-sm hover:underline">Cancel Service</button>
                    </div>
                  </div>
                )}
                
                {b.status === 'quote_received' && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2"><span className="text-gray-700 font-bold">Quote:</span><span className="text-xl font-bold text-green-700">${b.quoteAmount}</span></div>
                    <button onClick={() => handleAcceptQuote(b.id)} className="w-full bg-green-600 text-white py-2 rounded font-bold">Accept Quote</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPCOMING CONFIRMED */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Upcoming Services</h2>
        {upcoming.length === 0 ? <p className="text-gray-500">No confirmed services.</p> : (
          <div className="space-y-4">
            {upcoming.map(b => (
              <div key={b.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{b.service}</h3>
                  <p className="text-gray-600">
                    {b.scheduledDate ? new Date(b.scheduledDate.seconds * 1000).toLocaleDateString() : new Date(b.requestedDate.seconds * 1000).toLocaleDateString()} 
                    <span className="mx-2">|</span> {b.requestedTimeSlot}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <button onClick={() => setRescheduleTarget(b)} className="text-blue-600 text-sm font-bold hover:underline">Reschedule</button>
                  <button onClick={() => handleCancel(b.id)} className="text-red-500 text-xs hover:underline">Cancel Service</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
/**
 * =================================================================
 * BLOCK 2: CustomerProfile
 * =================================================================
 */
function CustomerProfile({ user, profile, setProfile }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(profile || {});

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), formData);
      setProfile(formData);
      alert("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Profile</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input 
            type="text" 
            className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.fullName || ''} 
            onChange={e => setFormData({...formData, fullName: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input 
            type="tel" 
            className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.phone || ''} 
            onChange={e => setFormData({...formData, phone: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input 
            type="text" 
            className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.address || ''} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.city || ''} 
              onChange={e => setFormData({...formData, city: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.state || ''} 
              onChange={e => setFormData({...formData, state: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Zip</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.zip || ''} 
              onChange={e => setFormData({...formData, zip: e.target.value})} 
            />
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

/**
 * =================================================================
 * BLOCK 3: CustomerPreferences
 * =================================================================
 */
function CustomerPreferences({ user, profile, setProfile }) {
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState(profile?.preferences || { 
    mowHeight: 'Medium', 
    pattern: 'No Preference', 
    pets: 'No', 
    gateCode: '', 
    avoidAreas: '', 
    notifications: { email: true, sms: false } 
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { preferences: prefs });
      setProfile({ ...profile, preferences: prefs });
      alert("Preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifChange = (type) => {
    setPrefs(prev => ({ 
      ...prev, 
      notifications: { 
        ...prev.notifications, 
        [type]: !prev.notifications?.[type] 
      } 
    }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Lawn Preferences</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Mow Height</label>
          <div className="flex gap-4">
            {['Low', 'Medium', 'High'].map(opt => (
              <button 
                key={opt} 
                type="button" 
                onClick={() => setPrefs({...prefs, mowHeight: opt})} 
                className={`flex-1 py-2 rounded-lg border ${prefs.mowHeight === opt ? 'bg-green-100 border-green-500 text-green-800' : 'border-gray-300 text-gray-600'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mowing Pattern</label>
          <select 
            value={prefs.pattern} 
            onChange={e => setPrefs({...prefs, pattern: e.target.value})} 
            className="block w-full rounded-md border-gray-300 border p-3"
          >
            <option>No Preference</option>
            <option>Stripes</option>
            <option>Checkers</option>
            <option>Diagonal</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Gate Code / Access Instructions</label>
          <input 
            type="text" 
            className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={prefs.gateCode} 
            onChange={e => setPrefs({...prefs, gateCode: e.target.value})} 
            placeholder="e.g. 1234 or Side Gate is unlocked" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Areas to Avoid</label>
          <textarea 
            rows={3} 
            className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={prefs.avoidAreas} 
            onChange={e => setPrefs({...prefs, avoidAreas: e.target.value})} 
            placeholder="e.g. Please avoid the flower bed near the porch." 
          />
        </div>
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Notification Settings</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefs.notifications?.email ?? true} 
                onChange={() => handleNotifChange('email')} 
                className="h-5 w-5 text-green-600 rounded focus:ring-green-500 border-gray-300" 
              />
              <span className="text-gray-700">Email Reminders</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefs.notifications?.sms ?? false} 
                onChange={() => handleNotifChange('sms')} 
                className="h-5 w-5 text-green-600 rounded focus:ring-green-500 border-gray-300" 
              />
              <span className="text-gray-700">Text Message Reminders</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Premium</span>
            </label>
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}

/**
 * =================================================================
 * BLOCK 4: BookingWizard (With Real-Time Conflict Detection)
 * =================================================================
 */
function BookingWizard({ user, profile, onCancel }) {
  const [step, setStep] = useState(1);
  const [selectedPro, setSelectedPro] = useState(null);
  const [pros, setPros] = useState([]);
  const [loadingPros, setLoadingPros] = useState(true);

  // --- SMART SCHEDULING DATA ---
  const [blockedDates, setBlockedDates] = useState([]); // PTO / Holidays
  const [defaultHours, setDefaultHours] = useState(null); // Weekly Schedule
  const [occupiedSlots, setOccupiedSlots] = useState({}); // { "2025-12-05": ["09:00 AM", "10:00 AM"] }

  // --- MULTI-SELECT STATE ---
  const [selectedServices, setSelectedServices] = useState([]);

  // --- PHOTO UPLOAD ---
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. INITIAL FETCHES (Pros, Exceptions, Settings)
  useEffect(() => {
    const fetchPros = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          list.push({ 
            id: data.uid, 
            name: data.businessName || data.fullName, 
            email: data.email, 
            area: "Service Area", 
            rating: 5.0, 
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}` 
          });
        });
        
        // Fallback for Demo/Testing if no admins exist
        if(list.length === 0) {
           list.push({
             id: '1', 
             name: 'Joshua Russelburg', 
             email: 'joshua@lawnpro.com', // FIX: Added specific email to fallback
             area: 'Morganfield', 
             rating: 5.0, 
             image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=josh'
           });
        }
        setPros(list);
      } catch (error) { console.error("Error fetching pros:", error); } 
      finally { setLoadingPros(false); }
    };
    fetchPros();

    // Fetch PTO/Holidays
    const unsubscribeExceptions = onSnapshot(collection(db, "availabilityExceptions"), (snapshot) => {
      const dates = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.start) {
          const d = new Date(data.start.seconds * 1000);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dates.push(`${y}-${m}-${day}`);
        }
      });
      setBlockedDates(dates);
    });

    // Fetch Weekly Hours
    getDoc(doc(db, "settings", "defaultHours")).then(snap => {
      if(snap.exists()) setDefaultHours(snap.data());
    });

    return () => unsubscribeExceptions();
  }, []);

  // 2. LISTEN FOR PRO'S EXISTING BOOKINGS (When Pro is Selected)
  useEffect(() => {
    if (!selectedPro) return;

    // Query confirmed or scheduled jobs for this specific pro
    const q = query(
      collection(db, "bookings"),
      where("proId", "==", selectedPro.id),
      where("status", "in", ["confirmed", "scheduled"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const busyMap = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        // Get date string YYYY-MM-DD
        const dateObj = data.scheduledDate ? new Date(data.scheduledDate.seconds * 1000) : new Date(data.requestedDate.seconds * 1000);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        if (!busyMap[dateKey]) busyMap[dateKey] = [];
        // Add the time slot to the busy list
        if (data.requestedTimeSlot) busyMap[dateKey].push(data.requestedTimeSlot);
      });
      setOccupiedSlots(busyMap);
    });

    return () => unsubscribe();
  }, [selectedPro]);

  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({ 
    name: profile?.fullName || '', address: profile?.address || '', city: profile?.city || '', 
    state: profile?.state || '', zip: profile?.zip || '', email: user?.email || '', phone: profile?.phone || '' 
  });

  useEffect(() => {
    if (useProfileAddress && profile) {
      setCustomerInfo(prev => ({
        ...prev,
        name: profile.fullName || '', address: profile.address || '', city: profile.city || '', 
        state: profile.state || '', zip: profile.zip || '', phone: profile.phone || '' 
      }));
    }
  }, [useProfileAddress, profile]);

  const toggleService = (service) => {
    const exists = selectedServices.find(s => s.id === service.id);
    if (exists) setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    else setSelectedServices(prev => [...prev, { ...service, date: '', time: '', freq: 'One-time', availableSlots: [] }]);
  };

  const checkDateAvailability = (rawDate) => {
    if (!rawDate) return { valid: false, msg: '' };
    const dateObj = new Date(rawDate + "T00:00:00");
    const dayName = DAYS_MAP[dateObj.getDay()];

    if (blockedDates.includes(rawDate)) return { valid: false, msg: "Unavailable (Provider Day Off)" };
    if (defaultHours && defaultHours[dayName]?.isOff) return { valid: false, msg: `Provider closed on ${dayName}s` };
    
    let slots = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];
    return { valid: true, slots };
  };

  const updateServiceSchedule = (index, field, value) => {
    const updated = [...selectedServices];
    const item = updated[index];
    if (field === 'date') {
      const check = checkDateAvailability(value);
      item.date = value; item.time = '';
      if (check.valid) { item.availableSlots = check.slots; item.error = null; } 
      else { item.availableSlots = []; item.error = check.msg; }
    } else { item[field] = value; }
    setSelectedServices(updated);
  };

  const handleCopyToAll = () => {
    if (selectedServices.length === 0) return;
    const master = selectedServices[0];
    const updated = selectedServices.map((s, i) => i === 0 ? s : { ...s, date: master.date, freq: master.freq, availableSlots: [...master.availableSlots], time: '' });
    setSelectedServices(updated);
    alert("Date copied! Please select times.");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      });
      Promise.all(promises).then(base64Images => setPhotos(base64Images));
    }
  };

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    try {
      const servicesSummary = selectedServices.map(s => `- ${s.title} (${s.freq}) on ${s.date} at ${s.time}`).join('\n');
      
      const promises = selectedServices.map(srv => {
        return addDoc(collection(db, "bookings"), {
          customerId: user.uid, customerName: customerInfo.name, customerEmail: customerInfo.email,
          address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`,
          proId: selectedPro?.id || 'admin_1', 
          proName: selectedPro?.name || 'LawnPro Provider',
          service: srv.title, requestedDate: new Date(srv.date), requestedTimeSlot: srv.time, frequency: srv.freq,
          photos: photos, status: "pending", createdAt: new Date()
        });
      });
      await Promise.all(promises);
      
      // FIX: Ensure we use the selected pro's email, or alert if missing
      const targetEmail = selectedPro?.email;
      if (targetEmail) {
        await sendStatusEmail(targetEmail, "new_request", `http://localhost:5173/admin`, {
          customerName: customerInfo.name,
          servicesSummary: servicesSummary
        });
      } else {
        console.warn("No provider email found. Notification skipped.");
      }
      
      setStep(5);
    } catch (error) { console.error("Error", error); alert("Failed to submit."); } 
    finally { setIsSubmitting(false); }
  };

  if (step === 1) return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Select a Pro</h2>
      {loadingPros ? <p className="text-center">Finding pros...</p> : pros.length === 0 ? <p className="text-center text-gray-500">No providers found nearby.</p> : (
        <div className="flex flex-col gap-4">
          {pros.map(pro => (
            <button key={pro.id} onClick={() => { setSelectedPro(pro); setStep(2); }} className="flex items-center p-4 border rounded-lg w-full hover:border-green-500 mb-2">
              <img src={pro.image} className="w-12 h-12 rounded-full mr-4"/>
              <div className="text-left"><h3 className="font-bold">{pro.name}</h3><p className="text-sm text-gray-500">{pro.area}</p></div>
            </button>
          ))}
        </div>
      )}
      <button onClick={onCancel} className="mt-4 text-gray-500 underline w-full text-center">Cancel</button>
    </div>
  );

  if (step === 2) return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Verify Info</h2>
      <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center"><input type="checkbox" checked={useProfileAddress} onChange={e => setUseProfileAddress(e.target.checked)} className="mr-2 h-5 w-5" /><label>Use Default Profile Address</label></div>
      <div className="space-y-3 mb-6">
        <input type="text" placeholder="Address" value={customerInfo.address} disabled={useProfileAddress} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full p-2 border rounded" />
        <div className="grid grid-cols-3 gap-2">
          <input type="text" placeholder="City" value={customerInfo.city} disabled={useProfileAddress} onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})} className="w-full p-2 border rounded" />
          <input type="text" placeholder="State" value={customerInfo.state} disabled={useProfileAddress} onChange={e => setCustomerInfo({...customerInfo, state: e.target.value})} className="w-full p-2 border rounded" />
          <input type="text" placeholder="Zip" value={customerInfo.zip} disabled={useProfileAddress} onChange={e => setCustomerInfo({...customerInfo, zip: e.target.value})} className="w-full p-2 border rounded" />
        </div>
      </div>
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
          <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
          <label htmlFor="photo-upload" className="cursor-pointer"><div className="text-gray-500"><span className="text-green-600 font-bold hover:underline">Click to upload</span> or drag and drop</div><p className="text-xs text-gray-400 mt-1">Max 4 photos, 500KB each.</p></label>
        </div>
        {photos.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{photos.map((src, i) => <img key={i} src={src} alt="Preview" className="w-full h-16 object-cover rounded border" />)}</div>}
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600">Back</button>
        <button onClick={() => setStep(3)} className="flex-1 bg-green-600 text-white py-2 rounded">Next</button>
      </div>
    </div>
  );

  if (step === 3) {
    const categories = [...new Set(SERVICES.map(s => s.category))];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-4 hover:underline flex items-center"><span className="mr-1">←</span> Back to Info</button>
          <h2 className="text-3xl font-bold mb-2 text-gray-800 text-center">Select Services</h2>
          <div className="space-y-8 mb-20">
            {categories.map(cat => (
              <div key={cat} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{cat} Services</h3>
                <div className="flex flex-col space-y-4">
                  {SERVICES.filter(s => s.category === cat).map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                      <button key={service.id} onClick={() => toggleService(service)} className={`w-full flex flex-col text-left p-4 border rounded-lg transition-all group relative ${isSelected ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-gray-200 hover:border-green-400'}`}>
                        <div className="flex justify-between items-center w-full mb-2">
                          <span className="font-bold text-lg text-gray-900">{service.title}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{service.price}</span>
                        </div>
                        <p className="text-sm text-gray-500">{service.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-lg flex justify-center">
            <button onClick={() => { if (selectedServices.length === 0) alert("Please select at least one service."); else setStep(4); }} disabled={selectedServices.length === 0}
              className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105">
              Next ({selectedServices.length} Selected) →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <button onClick={() => setStep(3)} className="text-sm text-gray-500 mb-4 hover:underline">← Back to Selection</button>
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Schedule Services</h2>
        {selectedServices.length > 1 && <button onClick={handleCopyToAll} className="text-sm text-blue-600 font-medium hover:underline">Apply date to all</button>}
      </div>
      <div className="space-y-6">
        {selectedServices.map((srv, index) => (
          <div key={srv.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4"><h3 className="text-lg font-bold text-gray-900">{srv.title}</h3><button onClick={() => toggleService(srv)} className="text-xs text-red-500 hover:underline">Remove</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
                <CustomCalendar value={srv.date} onChange={(val) => updateServiceSchedule(index, 'date', val)} isBlocked={(dateStr) => !checkDateAvailability(dateStr).valid} />
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Frequency</label><select value={srv.freq} onChange={(e) => updateServiceSchedule(index, 'freq', e.target.value)} className="w-full p-3 border rounded text-sm bg-gray-50">{['One-time', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly'].map(f => <option key={f}>{f}</option>)}</select></div>
            </div>
            {srv.date && !srv.error && srv.availableSlots.length > 0 && (
              <div className="mt-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {srv.availableSlots.map(t => {
                  // CONFLICT CHECK 1: Other services in this current booking
                  const isTakenSelf = selectedServices.some((otherSrv, i) => i !== index && otherSrv.date === srv.date && otherSrv.time === t);
                  // CONFLICT CHECK 2: Existing Database Bookings for this Pro
                  const isTakenDB = occupiedSlots[srv.date]?.includes(t);
                  
                  const isTaken = isTakenSelf || isTakenDB;

                  return (
                    <button 
                      key={t} 
                      onClick={() => !isTaken && updateServiceSchedule(index, 'time', t)} 
                      disabled={isTaken} 
                      className={`text-xs py-2 border rounded transition-colors 
                        ${srv.time === t ? 'bg-green-600 text-white border-green-600' : 
                          isTaken ? 'bg-gray-100 text-gray-400 cursor-not-allowed decoration-slice line-through' : 
                          'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-green-300'}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 border-t pt-6"><button onClick={handleSubmitRequest} disabled={isSubmitting || selectedServices.some(s => !s.date || !s.time)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 disabled:opacity-50">{isSubmitting ? 'Processing...' : `Confirm ${selectedServices.length} Bookings`}</button></div>
    </div>
  );

  if (step === 5) return (
    <div className="text-center py-16 px-4">
      <h2 className="text-3xl text-gray-900 font-bold mb-2">Booking Successful!</h2>
      <p className="text-gray-600 mb-8">We have received your requests for <span className="font-bold">{selectedServices.length} services</span>. The provider will review them shortly.</p>
      <button onClick={onCancel} className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition-colors">Return to Dashboard</button>
    </div>
  );
}
/**
 * =================================================================
 * MAIN CUSTOMER PORTAL COMPONENT
 * =================================================================
 */
export default function CustomerPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) setProfile(docSnap.data());
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-green-700 tracking-tight">LawnPro</h1>
        <div className="flex gap-4">
          <button onClick={() => setCurrentTab('dashboard')} className={`font-medium transition-colors ${currentTab === 'dashboard' ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Dashboard</button>
          <button onClick={() => setCurrentTab('profile')} className={`font-medium transition-colors ${currentTab === 'profile' ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Profile</button>
          <button onClick={() => setCurrentTab('preferences')} className={`font-medium transition-colors ${currentTab === 'preferences' ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Preferences</button>
        </div>
        <button onClick={() => auth.signOut()} className="text-sm text-red-500 font-medium hover:text-red-700">Sign Out</button>
      </nav>

      <div className="flex-1 container mx-auto p-6 pb-24">
        {/* Header Action - Only on Dashboard */}
        {currentTab === 'dashboard' && (
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Welcome, {profile?.fullName || user.email}</h2>
            <button 
              onClick={() => setCurrentTab('booking')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors font-bold flex items-center gap-2"
            >
              <span>+</span> Request New Service
            </button>
          </div>
        )}

        {/* Tab Content Rendering Logic */}
        {currentTab === 'dashboard' && <DashboardHome user={user} />}
        {currentTab === 'profile' && <CustomerProfile user={user} profile={profile} setProfile={setProfile} />}
        {currentTab === 'preferences' && <CustomerPreferences user={user} profile={profile} setProfile={setProfile} />}
        {currentTab === 'booking' && (
          <BookingWizard 
            user={user} 
            profile={profile} 
            onCancel={() => setCurrentTab('dashboard')} 
          />
        )}
      </div>
    </div>
  );
}