import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Get all bookings for this pro
        const q = query(collection(db, "bookings"), where("proId", "==", user.uid));
        const snapshot = await getDocs(q);
        
        // 2. Aggregate unique clients
        const clientMap = new Map();

        snapshot.forEach(doc => {
          const data = doc.data();
          // Use customerEmail as a unique key
          if (data.customerEmail && !clientMap.has(data.customerEmail)) {
            clientMap.set(data.customerEmail, {
              id: data.customerId || doc.id,
              name: data.customerName,
              email: data.customerEmail,
              phone: data.customerPhone,
              address: data.address,
              lastService: data.requestedDate ? new Date(data.requestedDate.seconds * 1000).toLocaleDateString() : 'N/A',
              totalJobs: 1
            });
          } else if (data.customerEmail) {
            // Update existing client stats
            const existing = clientMap.get(data.customerEmail);
            existing.totalJobs += 1;
            // Keep most recent date logic if needed, currently simplified
          }
        });

        setClients(Array.from(clientMap.values()));
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (loading) return <p className="p-8 text-center">Loading clients...</p>;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">My Clients</h2>
        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
          {clients.length} Active
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Address</th>
              <th className="p-4">Jobs</th>
              <th className="p-4">Last Service</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr key={client.email} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">{client.name}</td>
                <td className="p-4">
                  <div className="text-sm text-gray-900">{client.phone}</div>
                  <div className="text-xs text-gray-500">{client.email}</div>
                </td>
                <td className="p-4 text-sm text-gray-600">{client.address}</td>
                <td className="p-4 text-sm text-gray-600">{client.totalJobs}</td>
                <td className="p-4 text-sm text-gray-600">{client.lastService}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No clients found yet. Confirm a booking to see them here!
          </div>
        )}
      </div>
    </div>
  );
}