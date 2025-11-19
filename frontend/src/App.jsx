import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AthleteSeasonDashboard from './pages/AthleteSeasonDashboard';
import Settings from './pages/Settings';

// A simple hash-based router
const publicRoutes = {
  '/': Login,
  '/register': Register,
};

const privateRoutes = {
  '/': Home,
  '/skater/:id': AthleteSeasonDashboard,
  '/settings': Settings,
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

// Function to find the matching route
const findRoute = (routes, path) => {
  // Check for exact match
  if (routes[path]) {
    return routes[path];
  }
  // Check for dynamic match (e.g., /skater/:id)
  const dynamicRoute = Object.keys(routes).find(
    (key) => key.split('/')[1] === path.split('/')[1] && key.includes(':id')
  );
  return routes[dynamicRoute];
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

  // If authenticated, show the private routes
  if (isAuthenticated) {
    const Component = findRoute(privateRoutes, path) || Home;
    return <Component />;
  }

  // If not authenticated, show the public routes
  const Component = findRoute(publicRoutes, path) || Login; // Default to Login page
  return <Component />;
}

export default App;