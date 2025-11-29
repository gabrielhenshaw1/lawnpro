import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";

export default function DashboardPage() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return; // Wait for auth

    setLoading(true);
    
    // --- QUERY 1: PENDING ---
    // Filter by BOTH status AND proId
    const pendingQuery = query(
      collection(db, "bookings"), 
      where("status", "==", "pending"),
      where("proId", "==", user.uid) // <--- CRITICAL FIX
    );
    
    // --- QUERY 2: CONFIRMED ---
    const confirmedQuery = query(
      collection(db, "bookings"), 
      where("status", "==", "confirmed"),
      where("proId", "==", user.uid) // <--- CRITICAL FIX
    );

    const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      setPendingBookings(bookings);
      setLoading(false);
    });

    const unsubscribeConfirmed = onSnapshot(confirmedQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      setConfirmedBookings(bookings);
      setLoading(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeConfirmed();
    };
  }, []); 

  const handleApprove = async (id) => {
    try { await updateDoc(doc(db, "bookings", id), { status: "confirmed" }); } 
    catch (error) { console.error("Error approving:", error); }
  };

  const handleDeny = async (id) => {
    try { await updateDoc(doc(db, "bookings", id), { status: "denied" }); } 
    catch (error) { console.error("Error denying:", error); }
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests Column */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
        {loading && <p>Loading...</p>}
        {!loading && pendingBookings.length === 0 && <p className="text-gray-500">No pending requests.</p>}
        <div className="space-y-4">
          {pendingBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{booking.service}</h3>
              <p className="text-gray-600">Customer: {booking.customerName}</p>
              <p className="text-gray-600">{booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'Date not set'}</p>
              <div className="flex gap-4 mt-4">
                <button onClick={() => handleApprove(booking.id)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Approve</button>
                <button onClick={() => handleDeny(booking.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Deny</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmed Schedule Column */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Confirmed Schedule</h2>
        {loading && <p>Loading...</p>}
        {!loading && confirmedBookings.length === 0 && <p className="text-gray-500">No confirmed jobs.</p>}
        <div className="space-y-4">
          {confirmedBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold">{booking.service}</h3>
              <p className="text-gray-600">Customer: {booking.customerName}</p>
              <p className="text-gray-600">{booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'Date not set'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}