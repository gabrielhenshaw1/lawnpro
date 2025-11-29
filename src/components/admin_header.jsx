import React from 'react';

/**
 * Header: Now takes a `title` prop to be dynamic
 */
export default function Header({ title }) {
  // Set a default description, or customize based on title
  const descriptions = {
    Dashboard: 'Manage pending requests and view your confirmed schedule.',
    Schedule: 'Set your default weekly hours and manage exceptions.',
    Clients: 'View and manage your client list.'
  };

  return (
    <header className="bg-white shadow-md p-6">
      <h1 className="text-2xl font-semibold text-gray-700">
        {title}
      </h1>
      <p className="text-gray-500">
        {descriptions[title] || 'Manage your business'}
      </p>
    </header>
  );
}