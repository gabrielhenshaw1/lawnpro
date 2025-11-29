import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase.js'; // <-- Fixed: Added .js extension
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function DeveloperPortal() {
  const [isDevLoggedIn, setIsDevLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App Data
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 1. DEVELOPER LOGIN ---
  // This is a separate login just for this page to keep it isolated.
  const handleDevLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // In a real app, you'd check if user.uid matches a hardcoded "Super Admin" ID here
      setIsDevLoggedIn(true);
      fetchApplications();
    } catch (error) {
      alert("Access Denied: " + error.message);
    }
  };

  // --- 2. FETCH APPLICATIONS ---
  const fetchApplications = async () => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "pending_admin"));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    setPendingAdmins(list);
    setLoading(false);
  };

  // --- 3. APPROVE ADMIN ---
  const handleApprove = async (user) => {
    if (!window.confirm(`Are you sure you want to APPROVE ${user.businessName}? They will gain full access.`)) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        role: 'admin',
        applicationStatus: 'approved',
        approvedAt: new Date()
      });
      alert("Admin Approved!");
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Error approving admin.");
    }
  };

  // --- 4. DENY ADMIN ---
  const handleDeny = async (user) => {
    if (!window.confirm(`Are you sure you want to DENY ${user.businessName}? This cannot be undone.`)) return;

    try {
      // Option A: Just mark as rejected (keeps data)
      await updateDoc(doc(db, "users", user.id), {
        role: 'rejected_admin',
        applicationStatus: 'denied'
      });
      
      // Option B: Delete completely (uncomment if preferred)
      // await deleteDoc(doc(db, "users", user.id));

      alert("Application Denied.");
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Error denying application.");
    }
  };

  if (!isDevLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full">
          <h1 className="text-3xl font-mono font-bold text-green-500 mb-6 text-center">DEV_ACCESS_TERMINAL</h1>
          <form onSubmit={handleDevLogin} className="space-y-4">
            <input type="email" placeholder="Dev Email" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Access Key" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors">INITIALIZE SESSION</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Developer Dashboard</h1>
          <button onClick={() => window.location.href = '/'} className="text-gray-500 hover:underline">Exit to Main Site</button>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700">Pending Provider Applications</h2>
            <button onClick={fetchApplications} className="text-blue-600 hover:underline text-sm">Refresh List</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Scanning database...</div>
          ) : pendingAdmins.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending applications found.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                <tr>
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Applicant</th>
                  <th className="p-4">Details</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingAdmins.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800">{app.businessName}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{app.fullName}</div>
                      <div className="text-sm text-gray-500">{app.email}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <p>Age: {app.age}</p>
                      <p>Employees: {app.employeeCount}</p>
                      <p>Experience: {app.yearsInBusiness} years</p>
                      <p>{app.businessAddress}</p>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => handleApprove(app)}
                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-200 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleDeny(app)}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
                      >
                        Deny
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}