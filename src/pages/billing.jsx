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

      // Only fetch jobs that are marked as 'completed'
      const q = query(
        collection(db, "bookings"), 
        where("proId", "==", user.uid),
        where("status", "in", ["completed"]) 
      );
      
      try {
        const snapshot = await getDocs(q);
        const list = [];
        let total = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          // Prefer finalBillAmount, fall back to quoteAmount, default to 0
          const billAmount = parseFloat(data.finalBillAmount || data.quoteAmount || 0);
          total += billAmount;
          
          list.push({
            id: doc.id,
            ...data,
            billAmount: billAmount,
            // Create a Date object for sorting and a string for display
            dateObj: data.completedAt ? new Date(data.completedAt.seconds * 1000) : new Date(),
            dateStr: data.completedAt ? new Date(data.completedAt.seconds * 1000).toLocaleDateString() : 'Unknown'
          });
        });
        
        // Sort by date, newest completed jobs first
        list.sort((a, b) => b.dateObj - a.dateObj);
        
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

  // CSV Export Function
  const handleExportCSV = () => {
    // Define headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Service,Customer,Address,Amount\n";

    // Add rows
    history.forEach(item => {
      const row = [
        item.dateStr,
        `"${item.service}"`, // Quote strings to handle potential commas
        `"${item.customerName}"`,
        `"${item.address}"`, 
        item.billAmount.toFixed(2)
      ];
      csvContent += row.join(",") + "\n";
    });

    // Create a virtual link and click it to trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lawnpro_billing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p className="p-8 text-center text-gray-500">Loading financial data...</p>;

  return (
    <div className="space-y-6">
      {/* HEADER SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Revenue</p>
          <p className="text-3xl font-extrabold text-green-600 mt-2">
            ${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </p>
        </div>

        {/* Card 2: Jobs Count */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Completed Jobs</p>
          <p className="text-3xl font-extrabold text-gray-800 mt-2">{history.length}</p>
        </div>

        {/* Card 3: Export Button */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
           <button 
             onClick={handleExportCSV} 
             className="w-full h-full bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Export CSV Report
           </button>
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
           <h2 className="text-lg font-bold text-gray-800">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold tracking-wider">
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
                <tr key={item.id} className="hover:bg-blue-50 transition-colors group">
                  <td className="p-4 text-gray-600 font-medium">{item.dateStr}</td>
                  <td className="p-4 text-gray-900 font-bold">{item.service}</td>
                  <td className="p-4 text-gray-700">
                    <div className="font-medium">{item.customerName}</div>
                    <div className="text-xs text-gray-400">{item.customerEmail}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>
                  <td className="p-4 text-right font-bold text-green-600 group-hover:text-green-700">
                    ${item.billAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-lg font-medium">No billing history yet.</p>
              <p className="text-sm">Mark a job as "Complete" on your dashboard to see it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}