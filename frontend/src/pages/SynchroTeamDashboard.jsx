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
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';
import { SynchroRosterTab } from '@/components/dashboard/tabs/SynchroRosterTab'; // <--- New Tab

export default function SynchroTeamDashboard() {
  const { token } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('roster'); // Default to Roster for Synchro
  const [loading, setLoading] = useState(true);

  const teamId = window.location.hash.split('/')[2];

  const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/synchro/${teamId}/`, 'GET', null, token); 
        setTeam(data);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [teamId, token]);

  if (loading) return <div className="p-8">Loading team...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  const tabs = [
      'roster', 'weekly', 'yearly', 'goals', 'programs', 
      'competitions', 'logs', 'health', 'analytics'
  ];

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 border-2 border-white shadow-sm">
                <Users className="h-8 w-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.team_name}</h1>
                <p className="text-muted-foreground flex gap-2 items-center">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{team.level}</span>
                    {team.federation && <span>{team.federation.code}</span>}
                </p>
            </div>
        </div>
        <a href="#/">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button>
        </a>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'roster' && <SynchroRosterTab team={team} onUpdate={fetchData} />}
        
        {/* Reuse standard tabs (They handle 'team' prop generically) */}
        {activeTab === 'weekly' && <WeeklyPlanTab team={team} />}
        {activeTab === 'yearly' && <YearlyPlansTab team={team} isSynchro={true} />}
        {activeTab === 'goals' && <GoalsTab team={team} isSynchro={true} />}
        {activeTab === 'programs' && <ProgramsTab team={team} isSynchro={true}/>}
        {activeTab === 'competitions' && <CompetitionsTab team={team} isSynchro={true}/>}
        {activeTab === 'logs' && <LogsTab team={team} isSynchro={true} />}
        {activeTab === 'health' && <HealthTab team={team} isSynchro={true} />}
        {activeTab === 'analytics' && <AnalyticsTab team={team} isSynchro={true}/>}
      </div>
    </div>
  );
}