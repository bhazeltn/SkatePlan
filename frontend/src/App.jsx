import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'; // <--- Standard Router
import { useAuth } from './AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AthleteSeasonDashboard from './pages/AthleteSeasonDashboard';
import Settings from './pages/Settings';
import YearlyPlanEditor from './pages/YearlyPlanEditor';
import TeamDashboard from './pages/TeamDashboard';
import SynchroTeamDashboard from './pages/SynchroTeamDashboard';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold">Loading...</h1>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Redirect any unknown public URL to Login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* --- PRIVATE ROUTES --- */
          <>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Dynamic ID Routes */}
            {/* Note: The :id part will be accessible via useParams() in the page */}
            <Route path="/skater/:id" element={<AthleteSeasonDashboard />} />
            <Route path="/team/:id" element={<TeamDashboard />} />
            <Route path="/synchro/:id" element={<SynchroTeamDashboard />} />
            <Route path="/plans/:id" element={<YearlyPlanEditor />} />
            
            {/* Redirect any unknown private URL to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </HashRouter>
  );
}

export default App;