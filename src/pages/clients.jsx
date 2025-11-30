import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null); // Track clicked client

  // Fetch clients logic
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
              totalJobs: 0,
              bookings: [] // Store bookings for detail view
            });
          }
          
          if (data.customerEmail) {
            // Update existing client stats
            const existing = clientMap.get(data.customerEmail);
            existing.totalJobs += 1;
            
            // Add this specific job to their history
            existing.bookings.push({
               id: doc.id,
               service: data.service,
               date: data.requestedDate ? new Date(data.requestedDate.seconds * 1000).toLocaleDateString() : 'TBD',
               status: data.status,
               price: data.finalBillAmount || data.quoteAmount || 0,
               rating: data.rating || null, // Future proofing
               feedback: data.feedback || null
            });
            
            // Sort bookings by date desc (newest first)
            existing.bookings.sort((a,b) => new Date(b.date) - new Date(a.date));
            
            // Update last service date if this one is newer
            // (Simplified logic: assuming the sort above puts newest at index 0)
            existing.lastService = existing.bookings[0].date;
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

  // --- DETAIL VIEW (Modal) ---
  if (selectedClient) {
     return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-end transition-opacity">
           {/* Side Panel Animation Wrapper */}
           <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto transform transition-transform">
              <div className="p-8">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                   Back to Client List
                </button>

                {/* Client Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                   <div className="flex justify-between items-start">
                      <div>
                         <h1 className="text-3xl font-bold text-gray-900">{selectedClient.name}</h1>
                         <p className="text-gray-500 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {selectedClient.address}
                         </p>
                      </div>
                      <div className="text-right">
                         <div className="text-sm text-gray-500 uppercase tracking-wider font-bold">Lifetime Value</div>
                         <div className="text-3xl font-bold text-green-600">
                            ${selectedClient.bookings.reduce((sum, b) => sum + parseFloat(b.price||0), 0).toLocaleString()}
                         </div>
                      </div>
                   </div>
                   <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                         <span className="block text-gray-400 text-xs uppercase font-bold mb-1">Email</span>
                         <span className="font-medium text-gray-700">{selectedClient.email}</span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                         <span className="block text-gray-400 text-xs uppercase font-bold mb-1">Phone</span>
                         <span className="font-medium text-gray-700">{selectedClient.phone || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                {/* Ratings & Feedback Section (Placeholder for future Customer App update) */}
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                   Ratings & Feedback
                   <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Beta</span>
                </h2>
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center mb-8">
                   <div className="flex justify-center mb-2 text-yellow-400 text-2xl">★★★★★</div>
                   <p className="text-gray-500 italic">"Joshua did an amazing job! The yard looks fantastic."</p>
                   <p className="text-xs text-gray-400 mt-2">- Mock Feedback (Real data coming soon)</p>
                </div>

                {/* Job History */}
                <h2 className="text-xl font-bold text-gray-800 mb-4">Service History</h2>
                <div className="space-y-3">
                   {selectedClient.bookings.map(job => (
                      <div key={job.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center hover:shadow-md transition-shadow">
                         <div>
                            <div className="font-bold text-gray-800 text-lg">{job.service}</div>
                            <div className="text-sm text-gray-500">{job.date}</div>
                         </div>
                         <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-1 ${
                               job.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                               job.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                               'bg-yellow-100 text-yellow-700'
                            }`}>
                               {job.status}
                            </span>
                            <div className="font-bold text-green-600">${job.price}</div>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
     );
  }

  if (loading) return <p className="p-8 text-center text-gray-500">Loading clients...</p>;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">Client Directory</h2>
        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
          {clients.length} Active Clients
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white text-gray-500 uppercase text-xs font-bold tracking-wider border-b border-gray-200">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Address</th>
              <th className="p-4">Total Jobs</th>
              <th className="p-4">Last Service</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map((client) => (
              <tr key={client.email} onClick={() => setSelectedClient(client)} className="hover:bg-indigo-50 transition-colors cursor-pointer group">
                <td className="p-4 font-medium text-gray-900 group-hover:text-indigo-600 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                      {client.name.charAt(0)}
                   </div>
                   {client.name}
                </td>
                <td className="p-4">
                  <div className="text-sm text-gray-900">{client.phone}</div>
                  <div className="text-xs text-gray-500">{client.email}</div>
                </td>
                <td className="p-4 text-sm text-gray-600 max-w-[200px] truncate" title={client.address}>{client.address}</td>
                <td className="p-4 text-sm text-gray-600 font-medium text-center">{client.totalJobs}</td>
                <td className="p-4 text-sm text-gray-600">{client.lastService}</td>
                <td className="p-4 text-right text-gray-400 group-hover:text-indigo-500">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
             <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             <p className="text-lg font-medium">No clients found yet.</p>
             <p className="text-sm">Complete a service request to build your client list.</p>
          </div>
        )}
      </div>
    </div>
  );
}