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
  const [currentPage, setCurrentPage] = useState('Dashboard');
  // New: specific data passed between pages (e.g. address for map tool)
  const [pageData, setPageData] = useState(null);

  // Wrapper to handle navigation + data passing
  const navigateTo = (page, data = null) => {
    setCurrentPage(page);
    setPageData(data);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Dashboard': return <DashboardPage onNavigate={navigateTo} />;
      // Pass navigation function so Requests can jump to Estimate Tool
      case 'Requests':  return <RequestsPage onNavigate={navigateTo} />; 
      // Pass any data (like address/bookingId) to Measurement Page
      case 'Estimate Tool': return <MeasurementPage initialData={pageData} />;
      case 'Schedule':  return <SchedulePage />;
      case 'Clients':   return <ClientsPage />;
      case 'Billing':   return <BillingPage />;
      default:          return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onNavigate={(page) => navigateTo(page, null)} currentPage={currentPage} />
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