import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';

// Import Tabs
import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
import { GoalsTab } from '@/components/dashboard/tabs/GoalsTab';
import { ProgramsTab } from '@/components/dashboard/tabs/ProgramsTab';
import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';
import { LogsTab } from '@/components/dashboard/tabs/LogsTab';
import { AnalyticsTab } from '@/components/dashboard/tabs/AnalyticsTab';
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';
import { GapAnalysisTab } from '@/components/dashboard/tabs/GapAnalysisTab';

export default function TeamDashboard() {
  const { token } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
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

  const handleDelete = async () => {
      if (!confirm(`Are you sure you want to delete ${team.team_name}? This cannot be undone.`)) return;
      try {
          await apiRequest(`/teams/${teamId}/`, 'DELETE', null, token);
          window.location.hash = '#/'; 
      } catch (e) {
          alert("Failed to delete team.");
      }
  };

  const formatTabLabel = (str) => {
      return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) return <div className="p-8">Loading team...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  const tabs = [
      'profile', 'weekly', 'yearly', 'gap_analysis', 'goals', 'programs', 
      'competitions', 'logs', 'health', 'analytics'
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
            {formatTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
          <div className="space-y-8">
              <Card>
                <CardHeader><CardTitle>Team Partners</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </CardContent>
              </Card>

              {/* DANGER ZONE */}
              <Card className="border-red-100">
                  <CardHeader className="bg-red-50/50 border-b border-red-100">
                      <CardTitle className="text-red-800 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" /> Danger Zone
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-900">Delete this team</p>
                          <p>Once you delete a team, there is no going back. Please be certain.</p>
                      </div>
                      <Button variant="destructive" onClick={handleDelete}>Delete Team</Button>
                  </CardContent>
              </Card>
          </div>
        )}

        {activeTab === 'weekly' && <WeeklyPlanTab team={team} />}
        {activeTab === 'yearly' && <YearlyPlansTab team={team} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab team={team} />}
        {activeTab === 'goals' && <GoalsTab team={team} />}
        {activeTab === 'programs' && <ProgramsTab team={team} />}
        {activeTab === 'competitions' && <CompetitionsTab team={team} />}
        {activeTab === 'logs' && <LogsTab team={team} />}
        {activeTab === 'health' && <HealthTab team={team} />}
        {activeTab === 'analytics' && <AnalyticsTab team={team} />}
      </div>
    </div>
  );
}