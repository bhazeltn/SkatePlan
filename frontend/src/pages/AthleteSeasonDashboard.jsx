import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
// Import Tabs
import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
import { ProfileTab } from '@/components/dashboard/tabs/ProfileTab';
import { GoalsTab } from '@/components/dashboard/tabs/GoalsTab';
import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';
import { LogsTab } from '@/components/dashboard/tabs/LogsTab';
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';

export default function AthleteSeasonDashboard() {
  const { token } = useAuth();
  
  // 1. Smarter ID extraction (handles "1?tab=yearly")
  const rawId = window.location.hash.split('/')[2] || '';
  const skaterId = rawId.split('?')[0]; // "1"

  // 2. Initialize tab from URL query param
  const [activeTab, setActiveTab] = useState(() => {
    const query = rawId.split('?')[1];
    const params = new URLSearchParams(query);
    return params.get('tab') || 'weekly';
  });

  const [skater, setSkater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- FETCH DATA ---
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

  // --- RENDER ---

  if (loading) return <div className="p-8">Loading athlete profile...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!skater) return <div className="p-8">Athlete not found.</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
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
        {['weekly', 'yearly', , 'competitions', 'goals', 'logs', 'health', 'profile'].map((tab) => (
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
        
        {/* --- WEEKLY TAB --- */}
        {activeTab === 'weekly' && (
           <WeeklyPlanTab skater={skater} />
        )}
        {/* ------------------ */}
        
        {/* --- YEARLY PLANS TAB --- */}
        {activeTab === 'yearly' && (
           <YearlyPlansTab skater={skater} />
        )}
        {/* --- COMPETITIONS TAB --- */}
        {activeTab === 'competitions' && (
           <CompetitionsTab skater={skater} />
        )}
        {/* --- GOALS TAB --- */}
        {activeTab === 'goals' && (
           <GoalsTab skater={skater} />
        )}
        {/* ----------------- */}

        {/* --- LOGS TAB --- */}
        {activeTab === 'logs' && (
           <LogsTab skater={skater} />
        )}
        {/* ---------------- */}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
           <ProfileTab skater={skater} onUpdated={fetchData} />
        )}
        
        {/* --- HEALTH TAB --- */}
        {activeTab === 'health' && (
           <HealthTab skater={skater} />
        )}
        {/* ------------------ */}

      </div>
    </div>
  );
}