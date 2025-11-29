import React from 'react';

// --- SVG ICONS ---
const IconDashboard = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);
const IconCalendar = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const IconClients = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);


/**
 * Sidebar: Now takes an `onNavigate` prop to tell App.jsx to change pages
 */
export default function Sidebar({ onNavigate, currentPage }) {
  const navItems = [
    { icon: <IconDashboard />, name: 'Dashboard' },
    { icon: <IconCalendar />, name: 'Schedule' },
    { icon: <IconClients />, name: 'Clients' },
  ];
  return (
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col fixed">
      <div className="text-2xl font-bold p-6 border-b border-gray-700">
        LawnPro Admin
      </div>
      <nav className="flex-1 p-4">
        <ul>
          {navItems.map((item) => {
            // Check if this is the currently active page
            const isActive = currentPage === item.name;
            return (
              <li key={item.name}>
                {/* Use an onClick to navigate, not a dead <a> tag */}
                <button
                  onClick={() => onNavigate(item.name)}
                  className={`flex items-center gap-4 p-3 rounded-lg w-full text-left transition-colors
                    ${isActive ? 'bg-indigo-600' : 'hover:bg-gray-700'}
                  `}
                >
                  {item.icon}
                  <span className="text-lg">{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}