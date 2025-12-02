import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { sendStatusEmail } from '../utils/notifications.js';

export default function RequestsPage({ onNavigate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quoteInputs, setQuoteInputs] = useState({});
  const [durationInputs, setDurationInputs] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("proId", "==", user.uid),
      where("status", "in", ["pending", "quote_received"])
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
    if (action === 'approve' && !window.confirm("Quick approve without quote?")) return;
    if (action === 'deny' && !window.confirm("Deny request?")) return;
    if (action === 'quote' && !data.amount) return alert("Enter price");

    try {
      if (action === 'quote') {
        await updateDoc(doc(db, "bookings", req.id), {
          status: 'quote_received',
          quoteAmount: data.amount,
          estimatedDuration: parseFloat(data.duration||1),
          proNotes: "Quote sent. Please review."
        });
        
        // --- NOTIFICATION LOGIC ---
        // Get the current user's name (Admin) to sign the email
        const adminName = auth.currentUser.displayName || auth.currentUser.email || "LawnPro Provider";
        
        // Send email to customer
        await sendStatusEmail(req.customerEmail, "quote_received", "http://localhost:5173/customer", {
          name: adminName
        });
        alert("Quote sent to customer!");

      } else {
        const status = action === 'approve' ? 'confirmed' : 'denied';
        await updateDoc(doc(db, "bookings", req.id), { status });
      }
    } catch (e) { 
      console.error(e); 
      alert("An error occurred while updating the request.");
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pending Requests & Quotes</h1>
      
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
        <div className="p-12 bg-white rounded-lg shadow text-center text-gray-500">No pending requests.</div>
      ) : (
        <div className="grid gap-6">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col md:flex-row">
              {/* Left: Info */}
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{req.service}</h3>
                    <p className="text-gray-600 mt-1">{req.customerName}</p>
                    <p className="text-sm text-gray-500">{req.address}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${req.status === 'quote_received' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {req.status === 'quote_received' ? 'Quote Sent' : 'New Request'}
                  </span>
                </div>

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

                {/* Photos */}
                {req.photos && req.photos.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Property Photos:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {req.photos.map((p, i) => (
                        typeof p === 'string' && p.startsWith('data:') ?
                        <img key={i} src={p} alt={`Property ${i+1}`} className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => setSelectedImage(p)} /> : null
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              {req.status === 'pending' && (
                <div className="bg-gray-50 p-6 w-full md:w-80 border-l border-gray-200 flex flex-col justify-center gap-3">
                  {/* Estimate Button */}
                  <button
                    onClick={() => handleEstimate(req)}
                    className="w-full bg-indigo-100 text-indigo-700 py-2 rounded font-bold hover:bg-indigo-200 flex items-center justify-center gap-2 border border-indigo-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    Estimate on Map
                  </button>

                  <div className="relative flex py-1 items-center"><div className="flex-grow border-t border-gray-300"></div></div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Price ($)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded" 
                        placeholder="0.00"
                        onChange={e => setQuoteInputs(prev => ({...prev, [req.id]: e.target.value}))} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Hours</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded" 
                        placeholder="1.0" 
                        step="0.5"
                        onChange={e => setDurationInputs(prev => ({...prev, [req.id]: e.target.value}))} 
                      />
                    </div>
                  </div>
                  
                  <button onClick={() => handleAction(req, 'quote', { amount: quoteInputs[req.id], duration: durationInputs[req.id] })}
                    className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
                    Send Quote
                  </button>
                  
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleAction(req, 'approve')} className="flex-1 text-green-600 hover:underline text-sm font-medium">Quick Approve</button>
                    <button onClick={() => handleAction(req, 'deny')} className="flex-1 text-red-500 hover:underline text-sm font-medium">Deny</button>
                  </div>
                </div>
              )}

              {req.status === 'quote_received' && (
                <div className="bg-yellow-50 p-6 w-full md:w-80 border-l border-yellow-100 flex flex-col justify-center text-center text-yellow-800">
                  <p className="font-medium">Quote Sent: ${req.quoteAmount}</p>
                  <p className="text-sm mt-1 opacity-75">Waiting for customer...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}