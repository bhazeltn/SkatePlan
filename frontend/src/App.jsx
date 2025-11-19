import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AthleteSeasonDashboard from './pages/AthleteSeasonDashboard';
import Settings from './pages/Settings';
import YearlyPlanEditor from './pages/YearlyPlanEditor';

// Route Definitions
const publicRoutes = {
  '/': Login,
  '/register': Register,
};

const privateRoutes = {
  '/': Home,
  '/settings': Settings,
  '/skater/:id': AthleteSeasonDashboard,
  '/plans/:id': YearlyPlanEditor,
};

// --- Custom Hook: Tracks the URL Hash ---
const useHash = () => {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Remove the '#' and return the path (e.g. "/plans/1")
  return hash.substring(1) || '/'; 
};

// --- Router Logic: Finds the matching component ---
const findRoute = (routes, currentPath) => {
  // 1. Remove trailing slashes for consistency (e.g. "/plans/1/" -> "/plans/1")
  const normalizedPath = currentPath.replace(/\/$/, '') || '/';

  // 2. Check for Exact Match
  if (routes[normalizedPath]) {
    return routes[normalizedPath];
  }

  // 3. Check for Dynamic Match (e.g. "/plans/:id")
  const dynamicKey = Object.keys(routes).find((routeKey) => {
    // Skip exact routes
    if (!routeKey.includes(':')) return false;

    // Convert routeKey (e.g. "/plans/:id") into a Regex
    // This replaces ":id" with a capture group "([^/]+)" which matches any string segment
    const regexPattern = '^' + routeKey.replace(/:[a-zA-Z0-9]+/, '([^/]+)') + '$';
    const regex = new RegExp(regexPattern);
    
    return regex.test(normalizedPath);
  });

  if (dynamicKey) {
    return routes[dynamicKey];
  }

  // 4. No match found
  console.log(`[Router] No match for path: "${currentPath}" (Normalized: "${normalizedPath}")`);
  return null;
};


function App() {
  const { isAuthenticated, loading } = useAuth();
  const path = useHash();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold">Loading...</h1>
      </div>
    );
  }

  // If authenticated, show private routes
  if (isAuthenticated) {
    const Component = findRoute(privateRoutes, path);
    // If no route matched, fallback to Home (Dashboard)
    return Component ? <Component /> : <Home />;
  }

  // If not authenticated, show public routes
  const Component = findRoute(publicRoutes, path);
  // If no route matched, fallback to Login
  return Component ? <Component /> : <Login />;
}

export default App;