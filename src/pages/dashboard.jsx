import React, { useState, useEffect } from 'react';
// Import our database (db) from firebase.js
import { db } from '../firebase.js'; 
// Import all the Firestore functions we need
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc 
} from "firebase/firestore";

/**
 * AdminDashboard: The component for the "Dashboard" page
 * This reads and writes to the "bookings" collection in Firestore.
 */
export default function DashboardPage() {
  // --- STATE ---
  const [pendingBookings, setPendingBookings] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- REAL-TIME DATA (READ) ---
  useEffect(() => {
    setLoading(true);
    
    // 1. Create a query to get all 'pending' bookings
    const pendingQuery = query(
      collection(db, "bookings"), 
      where("status", "==", "pending")
    );
    
    // 2. Create a query to get all 'confirmed' bookings
    const confirmedQuery = query(
      collection(db, "bookings"), 
      where("status", "==", "confirmed")
    );

    // 3. Set up the REAL-TIME listener for PENDING bookings
    const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });
      setPendingBookings(bookings);
      setLoading(false);
    });

    // 4. Set up the REAL-TIME listener for CONFIRMED bookings
    const unsubscribeConfirmed = onSnapshot(confirmedQuery, (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });
      setConfirmedBookings(bookings);
      setLoading(false);
    });

    // 5. Cleanup function: unsubscribes when the component unmounts
    return () => {
      unsubscribePending();
      unsubscribeConfirmed();
    };
  }, []); 


  // --- WRITE DATA (FUNCTIONS) ---

  // This function runs when the admin clicks "Approve"
  const handleApprove = async (id) => {
    console.log(`Approving booking #${id}`);
    const bookingDoc = doc(db, "bookings", id);
    try {
      await updateDoc(bookingDoc, {
        status: "confirmed" // Change the status in Firestore
      });
    } catch (error) {
      console.error("Error approving document: ", error);
    }
  };

  // This function runs when the admin clicks "Deny"
  const handleDeny = async (id) => {
    console.log(`Denying booking #${id}`);
    const bookingDoc = doc(db, "bookings", id);
    try {
      await updateDoc(bookingDoc, {
        status: "denied" // Change the status in Firestore
      });
    } catch (error) {
      console.error("Error denying document: ", error);
    }
  };

  // This is a TEST function so we can see our app work!
  const createTestRequest = async () => {
    console.log("Creating test request...");
    try {
      await addDoc(collection(db, "bookings"), {
        customerName: "Test Customer",
        service: "Fertilization",
        requestedDate: new Date(), // Sets it to right now
        status: "pending"
      });
    } catch (error) {
      console.error("Error creating test request: ", error);
    }
  };


  // --- RENDER THE COMPONENT ---
  return (
    <div className="space-y-6">
      
      {/* TEST BUTTON */}
      <div className="bg-white p-4 rounded-lg shadow-md flex justify-end">
        <button
          onClick={createTestRequest}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Test Request
        </button>
      </div>

      {/* Column 1: Pending Requests (US3) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Pending Requests</h2>
        {loading && <p>Loading...</p>}
        {!loading && pendingBookings.length === 0 && (
          <p className="text-gray-500">No pending requests.</p>
        )}
        <div className="space-y-4">
          {pendingBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{booking.service}</h3>
              <p className="text-gray-600">Customer: {booking.customerName}</p>
              <p className="text-gray-600">
                {booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'Date not set'}
              </p>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => handleApprove(booking.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDeny(booking.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Confirmed Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Confirmed Schedule</h2>
        {loading && <p>Loading...</p>}
        {!loading && confirmedBookings.length === 0 && (
          <p className="text-gray-500">No confirmed jobs on the schedule.</p>
        )}
        <div className="space-y-4">
          {confirmedBookings.map((booking) => (
            <div key={booking.id} className="p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold">{booking.service}</h3>
              <p className="text-gray-600">Customer: {booking.customerName}</p>
              <p className="text-gray-600">
                {booking.requestedDate ? new Date(booking.requestedDate.seconds * 1000).toLocaleDateString() : 'Date not set'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}