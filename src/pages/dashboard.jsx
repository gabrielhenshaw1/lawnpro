import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";

export default function DashboardPage() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Local state for inputs
  const [quoteInputs, setQuoteInputs] = useState({});
  const [durationInputs, setDurationInputs] = useState({}); 
  const [finalBillInputs, setFinalBillInputs] = useState({});
  
  // Image Modal State
  const [selectedImage, setSelectedImage] = useState(null); 

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return; 

    setLoading(true);
    
    // 1. PENDING QUERY
    const pendingQuery = query(
      collection(db, "bookings"), 
      where("proId", "==", user.uid),
      where("status", "in", ["pending", "quote_received"]) 
    );
    
    // 2. CONFIRMED QUERY
    const confirmedQuery = query(
      collection(db, "bookings"), 
      where("status", "==", "confirmed"),
      where("proId", "==", user.uid)
    );

    const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      bookings.sort((a, b) => a.createdAt - b.createdAt);
      setPendingBookings(bookings);
      setLoading(false);
    });

    const unsubscribeConfirmed = onSnapshot(confirmedQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      bookings.sort((a, b) => a.requestedDate - b.requestedDate);
      setConfirmedBookings(bookings);
      setLoading(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeConfirmed();
    };
  }, []); 

  // --- ACTIONS ---

  const handleApprove = async (id) => {
    if(!window.confirm("Confirm this job immediately without a quote?")) return;
    const duration = durationInputs[id] || 1; 
    
    try { 
      await updateDoc(doc(db, "bookings", id), { 
        status: "confirmed",
        estimatedDuration: parseFloat(duration) 
      }); 
    } 
    catch (error) { console.error("Error approving:", error); }
  };

  const handleDeny = async (id) => {
    if(!window.confirm("Deny this request?")) return;
    try { await updateDoc(doc(db, "bookings", id), { status: "denied" }); } 
    catch (error) { console.error("Error denying:", error); }
  };

  const handleSendQuote = async (id) => {
    const amount = quoteInputs[id];
    const duration = durationInputs[id] || 1;
    
    if (!amount) return alert("Please enter a quote amount.");

    try {
      await updateDoc(doc(db, "bookings", id), { 
        status: "quote_received",
        quoteAmount: amount,
        estimatedDuration: parseFloat(duration),
        proNotes: "Based on your property size and photos." 
      });
      alert("Quote sent to customer!");
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  };

  const handleMarkComplete = async (id) => {
    const finalAmount = finalBillInputs[id];
    if(!window.confirm("Mark this job as complete?")) return;

    try {
      await updateDoc(doc(db, "bookings", id), { 
        status: "completed",
        finalBillAmount: finalAmount || null,
        completedAt: new Date()
      });
    } catch (error) {
      console.error("Error completing job:", error);
    }
  };

  const handleQuoteInputChange = (id, value) => {
    setQuoteInputs(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="space-y-8 relative">
      
      {/* --- IMAGE ZOOM MODAL --- */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={selectedImage} alt="Zoomed" className="max-w-full max-h-[90vh] rounded shadow-lg" />
            <button 
              className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center font-bold hover:bg-gray-200"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* --- PENDING REQUESTS COLUMN --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Pending Requests & Quotes</h2>
        {loading && <p>Loading...</p>}
        {!loading && pendingBookings.length === 0 && <p className="text-gray-500">No pending requests.</p>}
        
        <div className="space-y-6">
          {pendingBookings.map((booking) => (
            <div key={booking.id} className="p-5 border rounded-xl bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
              
              {/* Header Info */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{booking.service}</h3>
                  <p className="text-sm text-gray-600">Customer: <span className="font-medium">{booking.customerName}</span></p>
                  <p className="text-sm text-gray-500">{booking.address}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Requested: {booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'TBD'} 
                    {booking.requestedTimeSlot ? ` @ ${booking.requestedTimeSlot}` : ''}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${booking.status === 'quote_received' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {booking.status === 'quote_received' ? 'Waiting on Customer' : 'Action Needed'}
                </span>
              </div>

              {/* PHOTOS SECTION */}
              {booking.photos && booking.photos.length > 0 && (
                <div className="mb-4 bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Property Photos Attached:</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.photos.map((photoData, idx) => (
                      // Check if it's a base64 data string (starts with "data:")
                      typeof photoData === 'string' && photoData.startsWith('data:') ? (
                        <img 
                          key={idx} 
                          src={photoData} 
                          alt="Property" 
                          className="w-24 h-24 object-cover rounded border border-gray-300 hover:scale-105 transition-transform cursor-pointer shadow-sm" 
                          onClick={() => setSelectedImage(photoData)} 
                          title="Click to zoom"
                        />
                      ) : (
                        // Fallback for old data (filenames)
                        <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-700 border">
                          <span>📷 {typeof photoData === 'string' ? photoData : 'Image'}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION AREA */}
              {booking.status === 'pending' ? (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Send Quote or Approve:</p>
                  
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Price Input */}
                    <div className="w-32">
                      <label className="text-xs text-gray-500 block mb-1">Price ($)</label>
                      <input 
                        type="number" 
                        placeholder="Price"
                        className="w-full pl-6 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        value={quoteInputs[booking.id] || ''}
                        onChange={(e) => handleQuoteInputChange(booking.id, e.target.value)}
                      />
                    </div>

                    {/* Duration Input */}
                    <div className="w-32">
                      <label className="text-xs text-gray-500 block mb-1">Est. Duration (Hrs)</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
                        value={durationInputs[booking.id] || 1}
                        onChange={(e) => setDurationInputs(prev => ({ ...prev, [booking.id]: e.target.value }))}
                      >
                        <option value="0.5">30 Mins</option>
                        <option value="1">1 Hour</option>
                        <option value="1.5">1.5 Hours</option>
                        <option value="2">2 Hours</option>
                        <option value="3">3 Hours</option>
                        <option value="4">4 Hours</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleSendQuote(booking.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 text-sm h-[38px]">
                        Send Quote
                      </button>
                      <button onClick={() => handleApprove(booking.id)} className="text-green-600 hover:text-green-800 text-sm font-medium h-[38px] px-2">
                        Quick Approve
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-right">
                    <button onClick={() => handleDeny(booking.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Deny Request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500 italic bg-gray-50 p-2 rounded text-center">
                  Waiting for customer to accept quote (${booking.quoteAmount})...
                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* --- CONFIRMED SCHEDULE COLUMN --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Confirmed Schedule</h2>
        {loading && <p>Loading...</p>}
        {!loading && confirmedBookings.length === 0 && <p className="text-gray-500">No confirmed jobs.</p>}
        
        <div className="space-y-4">
          {confirmedBookings.map((booking) => (
            <div key={booking.id} className="p-4 border-l-4 border-green-500 bg-white rounded shadow-sm flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                   <h3 className="font-bold text-gray-900 text-lg">{booking.service}</h3>
                   {booking.frequency && booking.frequency !== 'One-time' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">{booking.frequency}</span>
                   )}
                </div>
                <p className="text-sm text-gray-600 font-medium mt-1">{booking.customerName}</p>
                <p className="text-sm text-gray-500">{booking.address}</p>
                {booking.estimatedDuration && (
                  <p className="text-xs text-gray-500 mt-1">Est. Duration: {booking.estimatedDuration} hrs</p>
                )}
                
                {/* Show Photos in Confirmed too */}
                {booking.photos && booking.photos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {booking.photos.slice(0, 3).map((p, i) => (
                       typeof p === 'string' && p.startsWith('data:') ? 
                         <img key={i} src={p} className="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer" onClick={() => setSelectedImage(p)} alt="ref"/> : null
                    ))}
                    {booking.photos.length > 3 && <span className="text-xs text-gray-400 self-center">+{booking.photos.length - 3} more</span>}
                  </div>
                )}
              </div>

              <div className="text-right pl-4 flex flex-col items-end">
                <p className="text-lg font-bold text-gray-800">
                  {booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'Date not set'}
                </p>
                <p className="text-sm text-gray-500 mb-3">{booking.requestedTimeSlot}</p>
                
                {booking.quoteAmount && <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded mb-3">Quote: ${booking.quoteAmount}</span>}

                <div className="flex items-center gap-2 mt-auto">
                    <input 
                        type="number" 
                        placeholder="Final Bill $"
                        className="w-24 px-2 py-1 text-sm border rounded text-right"
                        value={finalBillInputs[booking.id] || (booking.quoteAmount || '')}
                        onChange={(e) => setFinalBillInputs(prev => ({...prev, [booking.id]: e.target.value}))}
                    />
                    <button 
                        onClick={() => handleMarkComplete(booking.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                        Complete
                    </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}