import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; 
import { collection, query, where, getDocs } from "firebase/firestore";

export default function BillingPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "bookings"), 
        where("proId", "==", user.uid),
        where("status", "in", ["completed"]) // Only fetch completed/billed jobs
      );
      
      try {
        const snapshot = await getDocs(q);
        const list = [];
        let total = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          const billAmount = parseFloat(data.finalBillAmount || data.quoteAmount || 0);
          total += billAmount;
          
          list.push({
            id: doc.id,
            ...data,
            billAmount: billAmount,
            date: data.completedAt ? new Date(data.completedAt.seconds * 1000).toLocaleDateString() : 'Unknown'
          });
        });
        
        // Sort by date, newest first
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setHistory(list);
        setTotalRevenue(total);
      } catch (error) {
        console.error("Error fetching billing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleExportCSV = () => {
    const headers = ["Date,Service,Customer,Address,Amount\n"];
    const rows = history.map(item => 
      `${item.date},"${item.service}","${item.customerName}","${item.address}",${item.billAmount}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lawnpro_billing_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p className="p-8 text-center">Loading billing history...</p>;

  return (
    <div className="space-y-6">
      {/* HEADER SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 uppercase font-bold">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 uppercase font-bold">Completed Jobs</p>
          <p className="text-3xl font-bold text-gray-800">{history.length}</p>
        </div>
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
           <button onClick={handleExportCSV} className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors flex items-center gap-2">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Export CSV
           </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200">
           <h2 className="text-xl font-bold text-gray-800">Billing History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="p-4">Date Completed</th>
                <th className="p-4">Service</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Address</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600">{item.date}</td>
                  <td className="p-4 font-medium text-gray-900">{item.service}</td>
                  <td className="p-4 text-gray-600">{item.customerName}</td>
                  <td className="p-4 text-sm text-gray-500 truncate max-w-[200px]">{item.address}</td>
                  <td className="p-4 text-right font-bold text-green-600">${item.billAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No completed jobs found. Mark a job as "Complete" on your dashboard to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}