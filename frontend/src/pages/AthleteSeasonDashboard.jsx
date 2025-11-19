import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditSkaterModal } from '@/components/dashboard/EditSkaterModal';
import { EditDisciplineModal } from '@/components/dashboard/EditDisciplineModal';

export default function AthleteSeasonDashboard() {
  const { token } = useAuth();
  const [skater, setSkater] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false); // State for delete modal

  // Get ID from hash URL (e.g. #/skater/1)
  const skaterId = window.location.hash.split('/')[2];

  // --- 1. FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skaterId}/`, 'GET', null, token); 
      setSkater(data);
    } catch (err) {
      console.error("Fetch error", err);
      setError("Could not load skater data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [skaterId, token]);

  // --- 2. HANDLERS ---

  const handleArchive = async () => {
    try {
      // Toggle the current state
      const newState = !skater.is_active;
      await apiRequest(`/skaters/${skaterId}/`, 'PATCH', { is_active: newState }, token);
      // Refresh data to show new status
      fetchData();
    } catch (err) {
      alert("Failed to update archive status.");
    }
  };

  const handleDelete = async () => {
    try {
      await apiRequest(`/skaters/${skaterId}/`, 'DELETE', null, token);
      // Redirect to roster on success
      window.location.hash = '#/';
    } catch (err) {
      alert("Failed to delete profile.");
    }
  };

  // --- RENDER ---

  if (loading) return <div className="p-8">Loading athlete profile...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!skater) return <div className="p-8">Athlete not found.</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          {/* We can still keep the flag here for visibility if you like, or remove it since it's in Personal Info now */}
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            {skater.full_name}
            {skater.federation && (
              <span title={skater.federation.name} className="text-2xl cursor-help">
                {skater.federation.flag_emoji}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Season: 2025-2026 • <span className={skater.is_active ? "text-green-600 font-medium" : "text-gray-500 font-medium"}>
              {skater.is_active ? 'Active' : 'Archived'}
            </span>
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
              
              {/* Personal Information */}
              <section>
                <h4 className="text-md font-semibold mb-4 text-gray-900 border-b pb-2">Personal Information</h4>
                <EditSkaterModal skater={skater} onSkaterUpdated={fetchData} />
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
                      <label className="text-sm font-medium text-muted-foreground">Home Club/Rink</label>
                      <p className="text-lg">{skater.home_club || 'Not set'}</p>
                   </div>
                   
                   {/* --- NEW FEDERATION FIELD --- */}
                   <div>
                      <label className="text-sm font-medium text-muted-foreground">Federation</label>
                      <div className="flex items-center gap-2 mt-1">
                        {skater.federation ? (
                            <>
                                <span className="text-2xl">{skater.federation.flag_emoji}</span>
                                <p className="text-lg">{skater.federation.name}</p>
                            </>
                        ) : (
                            <p className="text-lg text-muted-foreground">Not set</p>
                        )}
                      </div>
                   </div>
                   {/* ---------------------------- */}

                </div>
              </section>

              {/* Disciplines */}
              <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-md font-semibold text-gray-900">Disciplines</h4>
                  <Button variant="outline" size="sm">Add Discipline +</Button>
                </div>
                
                {skater.planning_entities && skater.planning_entities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skater.planning_entities.map((entity) => (
                      <div key={entity.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{entity.name}</p>
                          {entity.current_level && <p className="text-sm text-muted-foreground">{entity.current_level}</p>}
                        </div>
                        <EditDisciplineModal entity={entity} onUpdated={fetchData} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No active disciplines.</p>
                  </div>
                )}
              </section>

              {/* Danger Zone */}
              <section className="pt-4">
                <h4 className="text-md font-semibold mb-4 text-red-600 border-b pb-2 border-red-100">Danger Zone</h4>
                <div className="flex gap-4">
                   {/* Archive Button */}
                   <Button 
                     variant="outline" 
                     className="text-gray-600"
                     onClick={handleArchive}
                   >
                     {skater.is_active ? 'Archive Athlete' : 'Unarchive Athlete'}
                   </Button>

                   {/* Delete Button (With Modal) */}
                   <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">Delete Profile</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete {skater.full_name}?</DialogTitle>
                          <DialogDescription>
                            This will permanently delete this athlete profile, all their plans, logs, and goals. 
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
                        </DialogFooter>
                      </DialogContent>
                   </Dialog>
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