import React, { useState, useEffect } from 'react';
// Import our database (db) from firebase.js
import { db } from '../firebase.js'; 
// Import all the Firestore functions we need
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultHoursShape = {
  Monday: { start: '09:00', end: '17:00', isOff: false },
  Tuesday: { start: '09:00', end: '17:00', isOff: false },
  Wednesday: { start: '09:00', end: '17:00', isOff: false },
  Thursday: { start: '09:00', end: '17:00', isOff: false },
  Friday: { start: '09:00', end: '17:00', isOff: false },
  Saturday: { start: '00:00', end: '00:00', isOff: true },
  Sunday: { start: '00:00', end: '00:00', isOff: true },
};

/**
 * =================================================================
 * BLOCK 1: WeeklyHoursEditor
 * =================================================================
 * Manages the default 9-5, Mon-Fri schedule.
 * Reads/Writes to a *single document*: `settings/defaultHours`
 */
function WeeklyHoursEditor() {
  const [hours, setHours] = useState(defaultHoursShape);
  const [loading, setLoading] = useState(true);

  // --- READ DATA ---
  // On load, try to fetch the saved default hours from Firestore
  useEffect(() => {
    const docRef = doc(db, "settings", "defaultHours");
    const getSettings = async () => {
      setLoading(true);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("Found existing default hours:", docSnap.data());
        // Merge with default shape to ensure all days are present
        setHours(prev => ({...defaultHoursShape, ...docSnap.data()}));
      } else {
        console.log("No default hours found, using default shape.");
      }
      setLoading(false);
    };
    getSettings();
  }, []);

  // --- UPDATE STATE (Local) ---
  const handleTimeChange = (day, type, value) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: value }
    }));
  };

  const toggleDayOff = (day) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], isOff: !prev[day].isOff }
    }));
  };

  // --- WRITE DATA (Save to Firestore) ---
  const handleSaveHours = async () => {
    console.log("Saving default hours:", hours);
    try {
      // We use `setDoc` here to create *or* overwrite the *single*
      // document named "defaultHours" in the "settings" collection.
      await setDoc(doc(db, "settings", "defaultHours"), hours);
      alert("Default hours saved!");
    } catch (error) {
      console.error("Error saving default hours: ", error);
      alert("Error saving hours. See console for details.");
    }
  };

  if (loading) {
    return <p>Loading default hours...</p>;
  }

  // --- RENDER THE COMPONENT ---
  return (
    <div className="w-full lg:w-1/2 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Default Weekly Hours</h2>
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="grid grid-cols-3 gap-4 items-center">
            <label className="font-medium text-gray-700">{day}</label>
            <div className="col-span-2 flex items-center gap-4">
              <input 
                type="checkbox"
                checked={hours[day].isOff}
                onChange={() => toggleDayOff(day)}
                className="h-5 w-5 rounded text-indigo-600"
              />
              <span className="text-sm">Day Off</span>
              
              {!hours[day].isOff && (
                <div className="flex gap-2">
                  <input 
                    type="time" 
                    value={hours[day].start}
                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  />
                  <input 
                    type="time" 
                    value={hours[day].end}
                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSaveHours}
        className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Save Default Hours
      </button>
    </div>
  );
}

/**
 * =================================================================
 * BLOCK 2: ExceptionManager
 * =================================================================
 * Manages one-off "days off" like PTO or holidays.
 * Reads/Writes to the `availabilityExceptions` collection.
 */
function ExceptionManager() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newReason, setNewReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(false); // <-- Your "All-day" feature

  // --- READ DATA (Real-time) ---
  useEffect(() => {
    setLoading(true);
    const exQuery = query(collection(db, "availabilityExceptions"));
    const unsubscribe = onSnapshot(exQuery, (querySnapshot) => {
      const exList = [];
      querySnapshot.forEach((doc) => {
        exList.push({ id: doc.id, ...doc.data() });
      });
      // Sort by start date, newest first
      exList.sort((a, b) => b.start.seconds - a.start.seconds);
      setExceptions(exList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- WRITE DATA (Add Exception) ---
  const handleAddException = async (e) => {
    e.preventDefault();
    if (!newDate) {
      alert("Please select a date.");
      return;
    }

    let startTime = newStartTime;
    let endTime = newEndTime;

    if (isAllDay) {
      startTime = '00:00'; // 12:00 AM
      endTime = '23:59'; // 11:59 PM
    }
    
    // Combine date and time into full JavaScript Date objects
    const startDateTime = new Date(`${newDate}T${startTime}`);
    const endDateTime = new Date(`${newDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time.");
      return;
    }

    try {
      await addDoc(collection(db, "availabilityExceptions"), {
        start: startDateTime,
        end: endDateTime,
        reason: newReason || "Unavailable",
        isAllDay: isAllDay // Save this for our records
      });
      // Reset form
      setNewDate('');
      setNewStartTime('09:00');
      setNewEndTime('17:00');
      setNewReason('');
      setIsAllDay(false);
    } catch (error) {
      console.error("Error adding exception: ", error);
    }
  };

  // --- DELETE DATA (Remove Exception) ---
  const handleDeleteException = async (id) => {
    // We'll use a simple confirm dialog, which is fine for admin tools
    if (!window.confirm("Are you sure you want to delete this exception?")) return;
    
    try {
      await deleteDoc(doc(db, "availabilityExceptions", id));
    } catch (error) {
      console.error("Error deleting exception: ", error);
    }
  };
  
  // Helper function to format the time
  const formatTime = (date) => {
    if (!date) return '...';
    // Converts Firestore Timestamp (if `date` is one) or JS Date to a readable time
    const jsDate = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return jsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Helper function to format the date
  const formatDate = (date) => {
    if (!date) return 'Date not set';
    const jsDate = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return jsDate.toLocaleDateString();
  }


  // --- RENDER THE COMPONENT ---
  return (
    <div className="w-full lg:w-1/2 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Schedule Overrides (PTO/Off-Days)</h2>
      
      {/* Form to add a new exception */}
      <form onSubmit={handleAddException} className="space-y-4 mb-6 pb-6 border-b">
        <div>
          <label htmlFor="ex-date" className="block text-sm font-medium text-gray-700">Date</label>
          <input 
            type="date" 
            id="ex-date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        {/* --- All-day Checkbox --- */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ex-all-day"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="h-4 w-4 rounded text-indigo-600"
          />
          <label htmlFor="ex-all-day" className="text-sm font-medium text-gray-700">
            All-day
          </label>
        </div>

        {/* --- Time inputs (disabled if 'All-day' is checked) --- */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="ex-start" className={`block text-sm font-medium ${isAllDay ? 'text-gray-400' : 'text-gray-700'}`}>Start Time</label>
            <input 
              type="time" 
              id="ex-start"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${isAllDay ? 'bg-gray-100' : ''}`}
              required
              disabled={isAllDay}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="ex-end" className={`block text-sm font-medium ${isAllDay ? 'text-gray-400' : 'text-gray-700'}`}>End Time</label>
            <input 
              type="time" 
              id="ex-end"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${isAllDay ? 'bg-gray-100' : ''}`}
              required
              disabled={isAllDay}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ex-reason" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
          <input 
            type="text" 
            id="ex-reason"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="e.g., Doctor's Appointment"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Add Day Off
        </button>
      </form>

      {/* List of current exceptions */}
      <h3 className="text-lg font-bold mb-4">Upcoming Overrides</h3>
      {loading && <p>Loading...</p>}
      {!loading && exceptions.length === 0 && (
        <p className="text-gray-500">No overrides scheduled.</p>
      )}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {exceptions.map((ex) => (
          <div key={ex.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
            <div>
              <p className="font-semibold">{formatDate(ex.start)}</p>
              <p className="text-sm text-gray-600">
                {ex.isAllDay ? 'All-day' : `${formatTime(ex.start)} - ${formatTime(ex.end)}`}
              </p>
              <p className="text-sm text-gray-600">{ex.reason}</p>
            </div>
            <button 
              onClick={() => handleDeleteException(ex.id)}
              className="text-gray-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


/**
 * =================================================================
 * BLOCK 3: Main SchedulePage Component
 * =================================================================
 * This is the main component exported by this file.
 * Its only job is to arrange the other blocks on the page.
 */
export default function SchedulePage() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Block 1 */}
      <WeeklyHoursEditor />
      
      {/* Block 2 */}
      <ExceptionManager />
    </div>
  );
}