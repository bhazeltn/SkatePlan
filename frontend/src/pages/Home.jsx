import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/api';
import { AddSkaterModal } from '@/components/dashboard/AddSkaterModal';
import { RosterList } from '@/components/dashboard/RosterList';

export default function Home() {
  const { user, logout, token } = useAuth();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the roster when the component loads
  useEffect(() => {
    if (user.role === 'COACH') {
      const fetchRoster = async () => {
        try {
          setLoading(true);
          const rosterData = await apiRequest('/roster/', 'GET', null, token);
          setRoster(rosterData || []);
        } catch (err) {
          setError(err.message || 'Failed to fetch roster.');
        } finally {
          setLoading(false);
        }
      };
      fetchRoster();
    } else {
      // Skaters/Guardians don't need to fetch a roster
      setLoading(false);
    }
  }, [token, user.role]);

  // Callback for the modal to add a new skater to the list
  const handleSkaterAdded = (newSkater) => {
    // We just re-fetch the whole roster to get all the new entity info
    const fetchRoster = async () => {
        const rosterData = await apiRequest('/roster/', 'GET', null, token);
        setRoster(rosterData || []);
    };
    fetchRoster();
  };

  // ----- Render Loading State -----
  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }
  
  // ----- Render for Skater/Guardian -----
  if (user.role !== 'COACH') {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome, {user.full_name}!</h1>
          <Button variant="outline" onClick={logout}>
            Log Out
          </Button>
        </div>
        <p>This is your Skater dashboard. More features coming soon!</p>
        <p>Your role is: <strong>{user.role}</strong></p>
      </div>
    );
  }

  // ----- Render for Coach -----
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <div className="flex items-center gap-4">
          <AddSkaterModal onSkaterAdded={handleSkaterAdded} />
          
          {/* --- ADDED SETTINGS BUTTON HERE --- */}
          <a href="#/settings">
            <Button variant="secondary">Settings</Button>
          </a>
          {/* ---------------------------------- */}

          <Button variant="outline" onClick={logout}>
            Log Out
          </Button>
        </div>
      </div>

      {error && <p className="text-red-600">Error: {error}</p>}

      {roster.length === 0 && !error && (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">Your Roster is Empty</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            Click the button to add your first athlete and get started.
          </p>
          <AddSkaterModal onSkaterAdded={handleSkaterAdded} />
        </div>
      )}

      {roster.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">My Roster ({roster.length})</h2>
          <RosterList roster={roster} />
        </>
      )}
    </div>
  );
}