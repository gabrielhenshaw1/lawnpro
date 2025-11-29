import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Admin Components
import Sidebar from './components/admin_sidebar.jsx';
import Header from './components/admin_header.jsx';
import DashboardPage from './pages/dashboard.jsx';
import SchedulePage from './pages/schedule.jsx';
import ClientsPage from './pages/clients.jsx';

// Import Customer Component
import CustomerRequestForm from './pages/customer_request.jsx';

// Import Auth & Developer Components
import LoginPage from './pages/login.jsx';
import DeveloperPortal from './pages/developer_portal.jsx'; // <-- IMPORT THIS

// Import CSS
import './App.css'; 

/**
 * ADMIN PORTAL LAYOUT
 */
function AdminLayout() {
  const [currentPage, setCurrentPage] = useState('Dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Dashboard': return <DashboardPage />;
      case 'Schedule':  return <SchedulePage />;
      case 'Clients':   return <ClientsPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title={currentPage} />
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
        {/* Route 1: The Landing Page is now Login */}
        <Route path="/" element={<LoginPage />} />

        {/* Route 2: The Customer Portal */}
        <Route path="/customer" element={<CustomerRequestForm />} />
        
        {/* Route 3: The Secret Developer Portal */}
        <Route path="/dev-portal-x9z" element={<DeveloperPortal />} />
        
        {/* Route 4: The Admin Portal */}
        <Route path="/admin/*" element={<AdminLayout />} />
      </Routes>
    </Router>
  );
}