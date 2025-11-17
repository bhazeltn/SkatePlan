import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// A simple hash-based router
const routes = {
  '/': Login,
  '/register': Register,
};

// Custom hook to get the current hash
const useHash = () => {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  return hash.substring(1) || '/'; // Get hash path (e.g., '#/register' -> '/register')
};

function App() {
  const { isAuthenticated, loading } = useAuth();
  const path = useHash();

  if (loading) {
    // Show a global loading spinner
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold">Loading...</h1>
      </div>
    );
  }

  // If authenticated, always show the Home component
  if (isAuthenticated) {
    return <Home />;
  }

  // If not authenticated, show the public routes
  const Component = routes[path] || Login; // Default to Login page
  return <Component />;
}

export default App;