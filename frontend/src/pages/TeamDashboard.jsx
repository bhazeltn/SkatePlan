import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft } from 'lucide-react';

// Import Tabs
import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
import { GoalsTab } from '@/components/dashboard/tabs/GoalsTab';
import { ProgramsTab } from '@/components/dashboard/tabs/ProgramsTab';
import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';
import { LogsTab } from '@/components/dashboard/tabs/LogsTab';
import { AnalyticsTab } from '@/components/dashboard/tabs/AnalyticsTab';
// Note: Weekly, Tests, Health, Profile are special/aggregated for teams
import { ProfileTab } from '@/components/dashboard/tabs/ProfileTab';
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';

export default function TeamDashboard() {
  const { token } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // Default
  const [loading, setLoading] = useState(true);

  const teamId = window.location.hash.split('/')[2];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/teams/${teamId}/`, 'GET', null, token); 
        setTeam(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId, token]);

  if (loading) return <div className="p-8">Loading team...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  // The Full Tab List
  const tabs = [
      'weekly', 'yearly', 'goals', 'programs', 
      'competitions', 'logs', 'health', 'analytics', 'profile',
  ];

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm">
                <Users className="h-8 w-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.team_name}</h1>
                <p className="text-muted-foreground flex gap-2 items-center">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{team.discipline}</span>
                    <span>{team.current_level || 'Level Not Set'}</span>
                </p>
            </div>
        </div>
        <a href="#/">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button>
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        
        {/* 1. PROFILE */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader><CardTitle>Team Profile</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <label className="text-xs font-bold text-gray-500 uppercase">Partner A</label>
                        <p className="text-lg font-medium text-gray-900">{team.partner_a_details?.full_name}</p>
                        <a href={`#/skater/${team.partner_a}`} className="text-xs text-brand-blue hover:underline mt-1 block">View Profile &rarr;</a>
                    </div>
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <label className="text-xs font-bold text-gray-500 uppercase">Partner B</label>
                        <p className="text-lg font-medium text-gray-900">{team.partner_b_details?.full_name}</p>
                        <a href={`#/skater/${team.partner_b}`} className="text-xs text-brand-blue hover:underline mt-1 block">View Profile &rarr;</a>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}

        {/* 2. WEEKLY */}
        {activeTab === 'weekly' && <WeeklyPlanTab team={team} />}

        {/* 3. YEARLY */}
        {activeTab === 'yearly' && <YearlyPlansTab team={team} />}

        {/* 4. GOALS */}
        {activeTab === 'goals' && <GoalsTab team={team} />}

        {/* 5. PROGRAMS */}
        {activeTab === 'programs' && <ProgramsTab team={team} />}

        {/* 6. COMPETITIONS */}
        {activeTab === 'competitions' && <CompetitionsTab team={team} />}

        {/* 7. LOGS */}
        {activeTab === 'logs' && <LogsTab team={team} />}

        {/* 8. HEALTH (WIRED UP!) */}
        {activeTab === 'health' && <HealthTab team={team} />}

        {/* 9. ANALYTICS */}
        {activeTab === 'analytics' && <AnalyticsTab team={team} />}

      </div>
    </div>
  );
}