import React from 'react';
import { useAuth } from '@/AuthContext';
import { Button } from '@/components/ui/button';

export default function AthleteSeasonDashboard() {
  const { user, logout } = useAuth();
  
  // This is a simple way to get the ID from the hash URL
  const skaterId = window.location.hash.split('/')[2];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Athlete Dashboard</h1>
        <Button variant="outline" onClick={logout}>
          Log Out
        </Button>
      </div>
      <p>This is the dashboard for Skater ID: <strong>{skaterId}</strong></p>
      
      <a href="#/" className="text-blue-600 hover:underline mt-4 inline-block">
        &larr; Back to Roster
      </a>

      {/* TODO (from Spec View 2):
        - Tab 1: Weekly Plan
        - Tab 2: Yearly Plans (YTPs)
        - Tab 3: Goals
        - ...etc
      */}
    </div>
  );
}