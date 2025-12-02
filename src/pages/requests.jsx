import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { sendStatusEmail } from '../utils/notifications.js';

export default function RequestsPage({ onNavigate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quoting State
  const [quoteInputs, setQuoteInputs] = useState({});
  const [durationInputs, setDurationInputs] = useState({});
  
  // Image Modal State
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Reschedule Counter-Offer State
  const [counterData, setCounterData] = useState({}); // { [reqId]: { date: '', time: '' } }
  const [showCounter, setShowCounter] = useState({}); // { [reqId]: boolean }

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    
    // FETCH: Pending, Quote Received, AND Reschedule Requests
    const q = query(
      collection(db, "bookings"),
      where("proId", "==", user.uid),
      where("status", "in", ["pending", "quote_received", "reschedule_pending_provider"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      setRequests(list);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleAction = async (req, action, data = {}) => {
    if (action === 'deny' && !window.confirm("Deny/Cancel request?")) return;
    
    const adminName = auth.currentUser.displayName || "LawnPro Provider";

    try {
      // --- 1. SEND QUOTE ---
      if (action === 'quote') {
        if (!data.amount) return alert("Enter price");
        
        await updateDoc(doc(db, "bookings", req.id), {
          status: 'quote_received',
          quoteAmount: data.amount,
          estimatedDuration: parseFloat(data.duration || 1),
          proNotes: "Quote sent. Please review."
        });
        
        await sendStatusEmail(req.customerEmail, "quote_received", "http://localhost:5173/customer", { name: adminName });
        alert("Quote sent!");
      
      // --- 2. APPROVE RESCHEDULE (ACCEPT CUSTOMER'S TIME) ---
      } else if (action === 'approve_reschedule') {
        await updateDoc(doc(db, "bookings", req.id), {
          status: 'confirmed',
          scheduledDate: req.proposedDate,
          requestedTimeSlot: req.proposedTime,
          proposedDate: null,
          proposedTime: null
        });
        
        await sendStatusEmail(req.customerEmail, "confirmed", "http://localhost:5173/customer");
        alert("Reschedule Confirmed!");

      // --- 3. COUNTER RESCHEDULE (PROPOSE NEW TIME) ---
      } else if (action === 'counter_reschedule') {
        const c = counterData[req.id];
        if (!c?.date || !c?.time) return alert("Select date and time.");
        
        await updateDoc(doc(db, "bookings", req.id), {
          status: 'reschedule_pending_customer', // Flip back to customer
          proposedDate: new Date(c.date),
          proposedTime: c.time,
          rescheduleInitiator: 'provider'
        });
        
        await sendStatusEmail(req.customerEmail, "reschedule_proposal", "http://localhost:5173/customer", { 
          name: adminName,
          proposedInfo: `${c.date} at ${c.time}`
        });
        
        alert("Counter-offer sent!");

      // --- 4. STANDARD APPROVE (QUICK) ---
      } else if (action === 'approve') {
        await updateDoc(doc(db, "bookings", req.id), { status: 'confirmed' });
      
      // --- 5. DENY / CANCEL ---
      } else if (action === 'deny') {
        await updateDoc(doc(db, "bookings", req.id), { status: 'cancelled' }); 
        await sendStatusEmail(req.customerEmail, "cancelled", "http://localhost:5173/customer");
      }
    } catch (e) { 
      console.error(e); 
      alert("An error occurred.");
    }
  };

  const handleEstimate = (req) => {
    onNavigate('Estimate Tool', {
      address: req.address,
      serviceId: req.serviceId || 'mowing',
      bookingId: req.id,
      customerName: req.customerName
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Request Inbox</h1>
      
      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={selectedImage} alt="Zoomed" className="max-w-full max-h-[90vh] rounded shadow-lg" />
            <button className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-200"> ✕ </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <div className="p-12 bg-white rounded-lg shadow text-center text-gray-500">Inbox empty.</div>
      ) : (
        <div className="grid gap-6">
          {requests.map(req => (
            <div key={req.id} className={`bg-white rounded-xl shadow-md border overflow-hidden flex flex-col md:flex-row ${req.status.includes('reschedule') ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'}`}>
              
              {/* Left: Info */}
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{req.service}</h3>
                    <p className="text-gray-600 font-medium">{req.customerName} <span className="text-xs text-gray-400 font-normal">({req.customerEmail})</span></p>
                    <p className="text-sm text-gray-500">{req.address}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${req.status.includes('reschedule') ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                    {req.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* RESCHEDULE DETAILS */}
                {req.status === 'reschedule_pending_provider' && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
                    <p className="font-bold text-orange-800 text-sm uppercase mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Reschedule Requested
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="text-center sm:text-left">
                        <span className="text-xs text-gray-500 block uppercase font-bold">Current</span> 
                        {new Date(req.requestedDate.seconds*1000).toLocaleDateString()} <br/> {req.requestedTimeSlot}
                      </div>
                      <div className="text-orange-400 font-bold text-xl">→</div>
                      <div className="text-center sm:text-left">
                        <span className="text-xs text-gray-500 block uppercase font-bold">Proposed</span> 
                        <span className="font-bold text-gray-900">{new Date(req.proposedDate.seconds*1000).toLocaleDateString()}</span> <br/> 
                        <span className="font-bold text-gray-900">{req.proposedTime}</span>
                      </div>
                    </div>

                    {/* Counter Offer Inputs */}
                    {showCounter[req.id] && (
                      <div className="mt-4 pt-3 border-t border-orange-200 grid grid-cols-2 gap-2 animate-fadeIn">
                        <input 
                          type="date" 
                          className="p-2 border rounded text-xs bg-white" 
                          onChange={e => setCounterData(prev => ({...prev, [req.id]: {...prev[req.id], date: e.target.value}}))} 
                        />
                        <select 
                          className="p-2 border rounded text-xs bg-white" 
                          onChange={e => setCounterData(prev => ({...prev, [req.id]: {...prev[req.id], time: e.target.value}}))}
                        >
                          <option value="">Select Time</option>
                          {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map(t => <option key={t}>{t}</option>)}
                        </select>
                        <button 
                          onClick={() => handleAction(req, 'counter_reschedule')} 
                          className="col-span-2 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 shadow-sm"
                        >
                          Send Counter Offer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STANDARD DETAILS */}
                {req.status === 'pending' && (
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {req.requestedDate ? new Date(req.requestedDate.seconds * 1000).toLocaleDateString() : 'TBD'}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {req.requestedTimeSlot || 'Any time'}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {req.photos && req.photos.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Property Photos:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {req.photos.map((p, i) => (
                        typeof p === 'string' && p.startsWith('data:') ?
                        <img key={i} src={p} alt={`Property ${i+1}`} className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedImage(p)} /> : null
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="bg-gray-50 p-6 w-full md:w-72 border-l border-gray-200 flex flex-col justify-center gap-3">
                
                {/* RESCHEDULE ACTIONS */}
                {req.status === 'reschedule_pending_provider' ? (
                  <>
                    <button onClick={() => handleAction(req, 'approve_reschedule')} className="bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-sm transition-colors">
                      Accept New Time
                    </button>
                    <button 
                      onClick={() => setShowCounter(prev => ({...prev, [req.id]: !prev[req.id]}))} 
                      className="bg-white border border-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-100 transition-colors"
                    >
                      {showCounter[req.id] ? "Cancel Counter" : "Propose Alternative"}
                    </button>
                    <button onClick={() => handleAction(req, 'deny')} className="text-red-500 text-sm hover:underline mt-2">
                      Decline & Cancel Job
                    </button>
                  </>
                ) : req.status === 'pending' ? (
                  /* STANDARD ACTIONS */
                  <>
                    <button onClick={() => handleEstimate(req)} className="w-full bg-indigo-100 text-indigo-700 py-2 rounded font-bold hover:bg-indigo-200 flex items-center justify-center gap-2 border border-indigo-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                      Estimate on Map
                    </button>

                    <div className="relative flex py-1 items-center"><div className="flex-grow border-t border-gray-300"></div></div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Price</label>
                        <input type="number" className="w-full p-2 border rounded" placeholder="$0.00" onChange={e => setQuoteInputs(prev => ({...prev, [req.id]: e.target.value}))} />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Hours</label>
                        <input type="number" className="w-full p-2 border rounded" placeholder="1.0" step="0.5" onChange={e => setDurationInputs(prev => ({...prev, [req.id]: e.target.value}))} />
                      </div>
                    </div>
                    
                    <button onClick={() => handleAction(req, 'quote', { amount: quoteInputs[req.id], duration: durationInputs[req.id] })} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      Send Quote
                    </button>
                    
                    <div className="flex gap-2 justify-between text-sm font-medium mt-2">
                      <button onClick={() => handleAction(req, 'approve')} className="text-green-600 hover:underline">Quick Approve</button>
                      <button onClick={() => handleAction(req, 'deny')} className="text-red-500 hover:underline">Deny</button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 italic py-4 bg-gray-50 rounded border border-gray-100">
                    <p>Quote Sent: <span className="font-bold text-gray-800">${req.quoteAmount}</span></p>
                    <p className="text-xs mt-1">Waiting for customer approval...</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}