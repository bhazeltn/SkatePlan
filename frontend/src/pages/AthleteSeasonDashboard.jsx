import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// We'll build these sub-components next
// import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';
// import { YearlyPlanTab } from '@/components/dashboard/tabs/YearlyPlanTab';
// import { ProfileTab } from '@/components/dashboard/tabs/ProfileTab';

export default function AthleteSeasonDashboard() {
  const { token } = useAuth();
  const [skater, setSkater] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get ID from hash URL (e.g. #/skater/1)
  const skaterId = window.location.hash.split('/')[2];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // We'll need to update the backend to return full skater details here
        // For now, we assume an endpoint exists or generic GET works
        // Note: We might need to create a specific RetrieveAPIView for this
        // But let's try the generic roster fetch for now or stub it
        const data = await apiRequest(`/skaters/${skaterId}/`, 'GET', null, token); 
        setSkater(data);
      } catch (err) {
        // Since we haven't built the specific Detail View yet, this might fail.
        // We will fix the backend view in the next step.
        console.error("Fetch error", err);
        setError("Could not load skater data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [skaterId, token]);

  if (loading) return <div className="p-8">Loading athlete profile...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!skater) return <div className="p-8">Athlete not found.</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{skater.full_name}</h1>
          <p className="text-muted-foreground">
            Season: 2025-2026 • {skater.is_active ? 'Active' : 'Archived'}
          </p>
        </div>
        <a href="#/">
          <Button variant="outline">&larr; Back to Roster</Button>
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b mb-6 overflow-x-auto">
        {['weekly', 'yearly', 'goals', 'logs', 'health', 'profile'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'weekly' && (
          <div className="text-center p-12 border-2 border-dashed rounded-lg bg-white">
            <h3 className="text-lg font-medium">Weekly Plan</h3>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        )}
        
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* 1. Personal Information */}
              <section>
                <h4 className="text-md font-semibold mb-4 text-gray-900 border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-lg font-medium">{skater.full_name}</p>
                   </div>
                   <div>
                      <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                      <p className="text-lg">{skater.date_of_birth}</p>
                   </div>
                   <div>
                      <label className="text-sm font-medium text-muted-foreground">Gender</label>
                      <p className="text-lg">{skater.gender || 'Not set'}</p>
                   </div>
                   <div>
                      <label className="text-sm font-medium text-muted-foreground">Home Club</label>
                      <p className="text-lg">{skater.home_club || 'Not set'}</p>
                   </div>
                </div>
              </section>

              {/* 2. Disciplines (Planning Entities) */}
              <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-md font-semibold text-gray-900">Disciplines</h4>
                  {/* This is where the "Add Discipline" button will go later */}
                  <Button variant="outline" size="sm">Add Discipline +</Button>
                </div>
                
                {skater.planning_entities && skater.planning_entities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skater.planning_entities.map((entity) => (
                      <div key={entity.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                        <div>
                          {/* We rely on the __str__ name from the backend for now */}
                          <p className="font-semibold">{entity.name}</p>
                          {entity.current_level && <p className="text-sm text-muted-foreground">{entity.current_level}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No active disciplines.</p>
                    <p className="text-xs text-gray-400 mt-1">Add a discipline to start planning.</p>
                  </div>
                )}
              </section>

              {/* 3. Management Actions */}
              <section className="pt-4">
                <h4 className="text-md font-semibold mb-4 text-red-600 border-b pb-2 border-red-100">Danger Zone</h4>
                <div className="flex gap-4">
                   <Button variant="outline" className="text-gray-600">
                     {skater.is_active ? 'Archive Athlete' : 'Unarchive Athlete'}
                   </Button>
                   <Button variant="destructive">Delete Profile</Button>
                </div>
              </section>
              
            </CardContent>
          </Card>
        )}
        
        {/* Placeholders for other tabs */}
        {['yearly', 'goals', 'logs', 'health'].includes(activeTab) && (
           <div className="text-center p-12 border-2 border-dashed rounded-lg bg-white">
            <h3 className="text-lg font-medium">{activeTab.toUpperCase()}</h3>
            <p className="text-muted-foreground">Tab content coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}