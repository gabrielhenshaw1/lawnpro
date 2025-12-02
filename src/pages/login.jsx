import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase.js'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('login');
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Customer Sign Up States
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState({
    fullName: '', address: '', city: '', state: '', zip: ''
  });
  const [savePreferences, setSavePreferences] = useState(true); 

  // Admin Application States
  const [adminApp, setAdminApp] = useState({
    fullName: '',
    businessName: '',
    businessAddress: '',
    age: '',
    employeeCount: '',
    yearsInBusiness: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // --- LOGIC: HANDLE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // ROUTING BASED ON ROLE
        if (userData.role === 'admin') {
          navigate('/admin');
        } else if (userData.role === 'developer') {
          navigate('/dev-portal-x9z'); 
        } else if (userData.role === 'pending_admin') {
          alert("Application Pending: Your provider account is currently under review by the developer team.");
          auth.signOut();
        } else {
          navigate('/customer'); 
        }
      } else {
        navigate('/customer');
      }
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: HANDLE CUSTOMER SIGN UP ---
  const handleCustomerSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (email !== confirmEmail) return setError("Emails do not match.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'customer',
        ...profile,
        preferencesOptIn: savePreferences,
        createdAt: new Date()
      });
      navigate('/customer');
    } catch (err) {
      setError("Failed to create account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: HANDLE ADMIN APPLICATION ---
  const handleAdminApply = async (e) => {
    e.preventDefault();
    setError('');

    if (adminApp.password !== adminApp.confirmPassword) return setError("Passwords do not match.");
    
    setLoading(true);
    try {
      // 1. Create the Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, adminApp.email, adminApp.password);
      const user = userCredential.user;

      // 2. Create the User Doc with 'pending_admin' role
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'pending_admin', // <--- Key for the Developer Dashboard
        fullName: adminApp.fullName,
        businessName: adminApp.businessName,
        businessAddress: adminApp.businessAddress,
        age: adminApp.age,
        employeeCount: adminApp.employeeCount,
        yearsInBusiness: adminApp.yearsInBusiness,
        applicationStatus: 'submitted',
        createdAt: new Date()
      });

      alert("Application Submitted! A developer will review your business details shortly.");
      setView('login'); 
    } catch (err) {
      setError("Application failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- VIEW: LOGIN ---
  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LawnPro</h1>
            <p className="text-gray-500">Sign in to your account</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" required className="mt-1 block w-full p-3 border rounded-lg"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" required className="mt-1 block w-full p-3 border rounded-lg"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              New Customer? <button onClick={() => setView('signup-customer')} className="text-green-600 font-medium hover:underline">Create Account</button>
            </p>
            <p className="text-sm text-gray-600">
              Own a Lawn Business? <button onClick={() => setView('signup-admin')} className="text-blue-600 font-medium hover:underline">Apply as Provider</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: ADMIN APPLICATION ---
  if (view === 'signup-admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <button onClick={() => setView('login')} className="text-sm text-gray-500 mb-6 hover:underline">← Back to Login</button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Provider Application</h2>
          <p className="text-gray-500 mb-6">Tell us about your business to get verified.</p>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          <form onSubmit={handleAdminApply} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Full Name</label>
                <input type="text" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.fullName} onChange={e => setAdminApp({...adminApp, fullName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Age</label>
                <input type="number" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.age} onChange={e => setAdminApp({...adminApp, age: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input type="text" required className="mt-1 block w-full border rounded-lg p-2"
                value={adminApp.businessName} onChange={e => setAdminApp({...adminApp, businessName: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Address</label>
              <input type="text" required className="mt-1 block w-full border rounded-lg p-2"
                value={adminApp.businessAddress} onChange={e => setAdminApp({...adminApp, businessAddress: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Count</label>
                <input type="number" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.employeeCount} onChange={e => setAdminApp({...adminApp, employeeCount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Years in Business</label>
                <input type="number" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.yearsInBusiness} onChange={e => setAdminApp({...adminApp, yearsInBusiness: e.target.value})} />
              </div>
            </div>

            <hr className="my-4" />

            <div>
              <label className="block text-sm font-medium text-gray-700">Login Email</label>
              <input type="email" required className="mt-1 block w-full border rounded-lg p-2"
                value={adminApp.email} onChange={e => setAdminApp({...adminApp, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.password} onChange={e => setAdminApp({...adminApp, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input type="password" required className="mt-1 block w-full border rounded-lg p-2"
                  value={adminApp.confirmPassword} onChange={e => setAdminApp({...adminApp, confirmPassword: e.target.value})} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mt-4">
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: CUSTOMER SIGN UP ---
  if (view === 'signup-customer') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
          <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <button onClick={() => setView('login')} className="text-sm text-gray-500 mb-6 hover:underline">← Back to Login</button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Customer Account</h2>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleCustomerSignUp} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" required className="mt-1 block w-full border rounded-lg p-2" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Confirm Email</label><input type="email" required className="mt-1 block w-full border rounded-lg p-2" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" required className="mt-1 block w-full border rounded-lg p-2" value={password} onChange={e => setPassword(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Confirm Password</label><input type="password" required className="mt-1 block w-full border rounded-lg p-2" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
              </div>
              
              <hr className="my-6" />
              
              <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" required className="mt-1 block w-full border rounded-lg p-2" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Address</label><input type="text" required className="mt-1 block w-full border rounded-lg p-2" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">City</label><input type="text" required className="mt-1 block w-full border rounded-lg p-2" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">State</label><input type="text" required className="mt-1 block w-full border rounded-lg p-2" value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Zip</label><input type="text" required className="mt-1 block w-full border rounded-lg p-2" value={profile.zip} onChange={e => setProfile({...profile, zip: e.target.value})} /></div>
              </div>

              {/* OPT-IN CHECKBOX */}
              <div className="flex items-start mt-4 bg-green-50 p-3 rounded-lg border border-green-100">
                 <div className="flex items-center h-5">
                   <input
                     id="optIn"
                     type="checkbox"
                     checked={savePreferences}
                     onChange={(e) => setSavePreferences(e.target.checked)}
                     className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                   />
                 </div>
                 <div className="ml-3 text-sm">
                   <label htmlFor="optIn" className="font-medium text-gray-700">Retain my preferences</label>
                   <p className="text-gray-500">Save my service history and lawn details for faster future bookings.</p>
                 </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 mt-4">{loading ? 'Creating...' : 'Create Account'}</button>
            </form>
          </div>
        </div>
      );
  }

  return null;
}