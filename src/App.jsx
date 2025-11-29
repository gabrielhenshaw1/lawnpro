import React, { useState } from 'react';
// Import our new "chunked" components
// --- UPDATED to omit file extensions ---
import Sidebar from './components/admin_sidebar';
import Header from './components/admin_header';
import DashboardPage from './pages/dashboard';
import SchedulePage from './pages/schedule';
import ClientsPage from './pages/clients';
// Import the base CSS
import './App.css'; 

export default function App() {
  // Add state to track the current page. Default to 'Dashboard'
  const [currentPage, setCurrentPage] = useState('Dashboard');

  // This function will decide which page component to show
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Schedule':
        return <SchedulePage />;
      case 'Clients':
        return <ClientsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Pass the navigation function AND current page to the Sidebar */}
      <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {/* Pass the current page name to the Header */}
        <Header title={currentPage} />
        
        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="container mx-auto">
            {/* Render the correct page component based on state */}
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );
}