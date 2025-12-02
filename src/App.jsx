import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Admin Components
import Sidebar from './components/admin_sidebar.jsx';
import Header from './components/admin_header.jsx';
import DashboardPage from './pages/dashboard.jsx';
import SchedulePage from './pages/schedule.jsx';
import ClientsPage from './pages/clients.jsx';
import BillingPage from './pages/billing.jsx'; 
import RequestsPage from './pages/requests.jsx'; 
import MeasurementPage from './pages/measurement.jsx'; 

// Import Customer Component
import CustomerRequestForm from './pages/customer_request.jsx';

// Import Auth Component
import LoginPage from './pages/login.jsx';

// Import CSS
import './App.css'; 

/**
 * ADMIN PORTAL LAYOUT
 */
function AdminLayout() {
  // State now holds an object: { name: 'Dashboard', data: null }
  const [activePage, setActivePage] = useState({ name: 'Dashboard', data: null });

  // Helper to update page and optional data
  const handleNavigate = (name, data = null) => {
    setActivePage({ name, data });
  };

  const renderCurrentPage = () => {
    switch (activePage.name) {
      case 'Dashboard': return <DashboardPage onNavigate={handleNavigate} />;
      case 'Requests':  return <RequestsPage onNavigate={handleNavigate} />; 
      // FIX: Pass onNavigate to MeasurementPage
      case 'Estimate Tool': return <MeasurementPage initialData={activePage.data} onNavigate={handleNavigate} />;
      case 'Schedule':  return <SchedulePage />;
      case 'Clients':   return <ClientsPage />;
      case 'Billing':   return <BillingPage />;
      default:          return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onNavigate={handleNavigate} currentPage={activePage.name} />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title={activePage.name} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="container mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/customer" element={<CustomerRequestForm />} />
        <Route path="/admin/*" element={<AdminLayout />} />
      </Routes>
    </Router>
  );
}