import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';

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
 * BLOCK 1: CustomerDashboard (Home)
 * Shows upcoming and past bookings.
 * =================================================================
 */
function DashboardHome({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("customerEmail", "==", user.email));
    
    getDocs(q).then((snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => b.requestedDate.seconds - a.requestedDate.seconds);
      setBookings(list);
      setLoading(false);
    });
  }, [user]);

  const handleAcceptQuote = async (bookingId) => {
    if(!window.confirm("Accept this quote and schedule the service?")) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: 'confirmed' });
      alert("Quote accepted! Service is now scheduled.");
      window.location.reload(); 
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <p className="text-center p-4">Loading your services...</p>;

  const requests = bookings.filter(b => ['pending', 'quote_received'].includes(b.status));
  const upcoming = bookings.filter(b => ['confirmed', 'scheduled', 'completed'].includes(b.status));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* SECTION 1: ACTIVE REQUESTS */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Active Requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-500 italic">No pending requests.</p>
        ) : (
          <div className="space-y-4">
            {requests.map(booking => (
              <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{booking.service}</h3>
                    <p className="text-sm text-gray-500">Requested for: {new Date(booking.requestedDate.seconds * 1000).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">Pro: {booking.proName}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wide">
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>

                {/* SHOW QUOTE IF AVAILABLE */}
                {booking.status === 'quote_received' && (
                  <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <p className="text-sm font-bold text-yellow-800 uppercase mb-2">Quote Received</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-700">Estimated Cost:</span>
                      <span className="text-2xl font-bold text-green-700">${booking.quoteAmount}</span>
                    </div>
                    {booking.proNotes && (
                       <p className="text-sm text-gray-600 mb-4 italic">" {booking.proNotes} "</p>
                    )}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAcceptQuote(booking.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        Accept & Schedule
                      </button>
                      <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: UPCOMING SERVICES */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Upcoming Services</h2>
        {upcoming.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg border border-dashed text-center">
            <p className="text-gray-500">No confirmed services coming up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map(booking => (
              <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{booking.service}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-gray-700 font-medium">
                        {booking.scheduledDate ? new Date(booking.scheduledDate.seconds * 1000).toLocaleDateString() : new Date(booking.requestedDate.seconds * 1000).toLocaleDateString()}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{booking.requestedTimeSlot || 'Time TBD'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                     {booking.status === 'completed' ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase">Completed</span>
                     ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Confirmed</span>
                     )}
                  </div>
                </div>
                {booking.frequency !== 'One-time' && (
                   <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      {booking.frequency}
                   </div>
                )}
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
          <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input type="tel" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
            value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Zip</label>
            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" 
              value={formData.zip || ''} onChange={e => setFormData({...formData, zip: e.target.value})} />
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
    mowHeight: 'Medium', pattern: 'No Preference', pets: 'No', gateCode: '', avoidAreas: '', notifications: { email: true, sms: false }
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
      ...prev, notifications: { ...prev.notifications, [type]: !prev.notifications?.[type] }
    }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Lawn Preferences</h2>
      <form onSubmit={handleSave} className="space-y-6">
        {/* ... (Inputs omitted for brevity, logic is same as before) ... */}
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Mow Height</label><div className="flex gap-4">{['Low', 'Medium', 'High'].map(opt => (<button key={opt} type="button" onClick={() => setPrefs({...prefs, mowHeight: opt})} className={`flex-1 py-2 rounded-lg border ${prefs.mowHeight === opt ? 'bg-green-100 border-green-500 text-green-800' : 'border-gray-300 text-gray-600'}`}>{opt}</button>))}</div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Mowing Pattern</label><select value={prefs.pattern} onChange={e => setPrefs({...prefs, pattern: e.target.value})} className="block w-full rounded-md border-gray-300 border p-3"><option>No Preference</option><option>Stripes</option><option>Checkers</option><option>Diagonal</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700">Gate Code / Access Instructions</label><input type="text" className="mt-1 block w-full rounded-md border-gray-300 border p-3" value={prefs.gateCode} onChange={e => setPrefs({...prefs, gateCode: e.target.value})} placeholder="e.g. 1234 or Side Gate is unlocked" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Areas to Avoid</label><textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 border p-3" value={prefs.avoidAreas} onChange={e => setPrefs({...prefs, avoidAreas: e.target.value})} placeholder="e.g. Please avoid the flower bed near the porch." /></div>
        <div className="pt-4 border-t border-gray-100"><h3 className="text-lg font-semibold mb-3 text-gray-800">Notification Settings</h3><div className="flex flex-col gap-3"><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={prefs.notifications?.email ?? true} onChange={() => handleNotifChange('email')} className="h-5 w-5 text-green-600 rounded focus:ring-green-500 border-gray-300" /><span className="text-gray-700">Email Reminders</span></label><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={prefs.notifications?.sms ?? false} onChange={() => handleNotifChange('sms')} className="h-5 w-5 text-green-600 rounded focus:ring-green-500 border-gray-300" /><span className="text-gray-700">Text Message Reminders</span></label></div></div>
        <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">{isSaving ? 'Saving...' : 'Save Preferences'}</button>
      </form>
    </div>
  );
}

/**
 * =================================================================
 * BLOCK 4: BookingWizard (Refactored)
 * Includes Dynamic Pro Fetching, Photo Upload, and 1-Col Layout
 * =================================================================
 */
function BookingWizard({ user, profile, onCancel }) {
  const [step, setStep] = useState(1); 
  const [selectedPro, setSelectedPro] = useState(null);
  const [pros, setPros] = useState([]);
  const [loadingPros, setLoadingPros] = useState(true);

  // --- DYNAMIC PRO FETCHING ---
  useEffect(() => {
    const fetchPros = async () => {
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        let displayArea = "Service Area";
        if (data.city && data.state) displayArea = `${data.city}, ${data.state}`;
        else if (data.businessAddress) displayArea = "Service Area"; 

        list.push({
          id: data.uid,
          name: data.businessName || data.fullName,
          area: displayArea,
          rating: 5.0,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`
        });
      });
      setPros(list);
      setLoadingPros(false);
    };
    fetchPros();
  }, []);

  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({ 
    name: profile?.fullName || '', address: profile?.address || '', city: profile?.city || '', 
    state: profile?.state || '', zip: profile?.zip || '', email: user?.email || '', phone: profile?.phone || '' 
  });
  const [selectedService, setSelectedService] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [frequency, setFrequency] = useState('One-time');
  const [availableSlots, setAvailableSlots] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]); 

  useEffect(() => {
    if (useProfileAddress && profile) {
      setCustomerInfo(prev => ({
        ...prev,
        name: profile.fullName || '', address: profile.address || '', city: profile.city || '', 
        state: profile.state || '', zip: profile.zip || '', phone: profile.phone || '' 
      }));
    }
  }, [useProfileAddress, profile]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setAvailableSlots(["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM"]); 
  };

  // --- PHOTO CONVERSION ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
       const files = Array.from(e.target.files);
       if (files.length > 4) { alert("Maximum 4 photos allowed."); return; }
       const promises = files.map(file => {
          return new Promise((resolve, reject) => {
              if (file.size > 500000) { alert(`File ${file.name} too large. Max 500KB.`); reject("Too large"); return; }
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
      await addDoc(collection(db, "bookings"), {
        customerId: user.uid,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`,
        proId: selectedPro.id,   // <--- IMPORTANT: Links request to selected admin
        proName: selectedPro.name,
        service: selectedService.title,
        requestedDate: new Date(selectedDate),
        requestedTimeSlot: selectedTimeSlot,
        frequency: frequency,
        photos: photos, // Save the ACTUAL base64 image data
        status: "pending",
        createdAt: new Date()
      });
      setStep(5);
    } catch (error) {
      console.error("Error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STEPS ---
  if (step === 1) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Find a Lawn Pro</h1>
        <p className="text-center text-gray-500 mb-8">Select a professional in your area.</p>
        {loadingPros ? <p className="text-center">Finding pros...</p> : pros.length === 0 ? <p className="text-center text-gray-500">No providers found.</p> : (
          <div className="flex flex-col gap-4">
            {pros.map(pro => (
              <button key={pro.id} onClick={() => { setSelectedPro(pro); setStep(2); }} className="flex items-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-500 transition-all text-left w-full group">
                <img src={pro.image} alt={pro.name} className="w-16 h-16 rounded-full mr-6 border-2 border-gray-100" />
                <div><h3 className="text-xl font-semibold group-hover:text-green-700">{pro.name}</h3><p className="text-gray-500">{pro.area}</p><div className="flex items-center mt-1"><span className="text-yellow-400">★</span><span className="ml-1 text-sm font-medium text-gray-700">{pro.rating} Rating</span></div></div>
                <div className="ml-auto"><span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium group-hover:bg-green-600 group-hover:text-white transition-colors">Select</span></div>
              </button>
            ))}
          </div>
        )}
        <button onClick={onCancel} className="mt-8 text-gray-500 underline w-full text-center">Cancel</button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Verify Info & Photos</h2>
      <div className="mb-4 bg-blue-50 p-3 rounded-lg flex items-center"><input type="checkbox" checked={useProfileAddress} onChange={e => setUseProfileAddress(e.target.checked)} className="mr-2 h-5 w-5" /><label>Use Default Profile Address</label></div>
      <div className="space-y-3 mb-6">
        <input type="text" placeholder="Address" value={customerInfo.address} disabled={useProfileAddress} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full p-2 border rounded" />
        <div className="grid grid-cols-3 gap-2"><input type="text" placeholder="City" value={customerInfo.city} disabled={useProfileAddress} className="w-full p-2 border rounded" /><input type="text" placeholder="State" value={customerInfo.state} disabled={useProfileAddress} className="w-full p-2 border rounded" /><input type="text" placeholder="Zip" value={customerInfo.zip} disabled={useProfileAddress} className="w-full p-2 border rounded" /></div>
      </div>
      <div className="border-t pt-4">
         <label className="block text-sm font-medium text-gray-700 mb-2">Upload Property Photos (Optional)</label>
         <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
            <label htmlFor="photo-upload" className="cursor-pointer"><div className="text-gray-500"><span className="text-green-600 font-bold hover:underline">Click to upload</span> or drag and drop</div><p className="text-xs text-gray-400 mt-1">Max 4 photos, 500KB each.</p></label>
         </div>
         {photos.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{photos.map((src, i) => <img key={i} src={src} alt="Preview" className="w-full h-16 object-cover rounded border" />)}</div>}
      </div>
      <div className="flex gap-2 mt-6"><button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600">Back</button><button onClick={() => setStep(3)} className="flex-1 bg-green-600 text-white py-2 rounded">Next</button></div>
    </div>
  );

  if (step === 3) {
    const categories = [...new Set(SERVICES.map(s => s.category))];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-4 hover:underline flex items-center"><span className="mr-1">←</span> Back to Info</button>
          <h2 className="text-3xl font-bold mb-2 text-gray-800 text-center">Select a Service</h2>
          <div className="space-y-8">
            {categories.map(cat => (
              <div key={cat} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{cat} Services</h3>
                <div className="flex flex-col space-y-4">
                  {SERVICES.filter(s => s.category === cat).map(service => (
                    <button key={service.id} onClick={() => { setSelectedService(service); setStep(4); }} className="w-full flex flex-col text-left p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
                      <div className="flex justify-between items-center w-full mb-2"><span className="font-bold text-lg text-gray-900 group-hover:text-green-700">{service.title}</span><span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full uppercase tracking-wide">{service.price}</span></div>
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">{service.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Schedule</h2>
      <div className="mb-6"><label className="block font-bold mb-2">How often?</label><div className="grid grid-cols-3 gap-2">{['One-time', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly'].map(freq => (<button key={freq} onClick={() => setFrequency(freq)} className={`p-2 border rounded text-sm ${frequency === freq ? 'bg-green-600 text-white' : 'bg-white'}`}>{freq}</button>))}</div></div>
      <input type="date" value={selectedDate} onChange={handleDateChange} className="w-full p-2 border rounded mb-4" />
      {availableSlots.length > 0 && <div className="grid grid-cols-3 gap-2 mb-4">{availableSlots.map(t => (<button key={t} onClick={() => setSelectedTimeSlot(t)} className={`p-2 border rounded text-sm ${selectedTimeSlot === t ? 'bg-green-600 text-white' : ''}`}>{t}</button>))}</div>}
      <button onClick={handleSubmitRequest} disabled={!selectedTimeSlot || isSubmitting} className="w-full bg-green-600 text-white py-3 rounded">{isSubmitting ? 'Booking...' : 'Confirm Booking'}</button>
    </div>
  );

  if (step === 5) return (
    <div className="text-center py-10">
      <h2 className="text-3xl text-green-600 font-bold mb-4">Success!</h2>
      <p>Your <strong>{frequency}</strong> {selectedService.title} service is pending approval.</p>
      <button onClick={onCancel} className="mt-8 bg-gray-800 text-white px-6 py-2 rounded">Back to Dashboard</button>
    </div>
  );
}

/**
 * =================================================================
 * MAIN CUSTOMER PORTAL COMPONENT
 * Manages Tabs and Auth State
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
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-700">LawnPro Customer</h1>
        <div className="flex gap-4">
          <button onClick={() => setCurrentTab('dashboard')} className={`font-medium ${currentTab === 'dashboard' ? 'text-green-600' : 'text-gray-500'}`}>Dashboard</button>
          <button onClick={() => setCurrentTab('profile')} className={`font-medium ${currentTab === 'profile' ? 'text-green-600' : 'text-gray-500'}`}>Profile</button>
          <button onClick={() => setCurrentTab('preferences')} className={`font-medium ${currentTab === 'preferences' ? 'text-green-600' : 'text-gray-500'}`}>Preferences</button>
        </div>
        <button onClick={() => auth.signOut()} className="text-sm text-red-500">Sign Out</button>
      </nav>
      <div className="flex-1 container mx-auto p-6">
        {currentTab === 'dashboard' && (
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Welcome, {profile?.fullName || user.email}</h2>
            <button onClick={() => setCurrentTab('booking')} className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors font-bold flex items-center gap-2"><span>+</span> Request New Service</button>
          </div>
        )}
        {currentTab === 'dashboard' && <DashboardHome user={user} />}
        {currentTab === 'profile' && <CustomerProfile user={user} profile={profile} setProfile={setProfile} />}
        {currentTab === 'preferences' && <CustomerPreferences user={user} profile={profile} setProfile={setProfile} />}
        {currentTab === 'booking' && <BookingWizard user={user} profile={profile} onCancel={() => setCurrentTab('dashboard')} />}
      </div>
    </div>
  );
}