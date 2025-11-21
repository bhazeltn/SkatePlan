import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

// We will reuse tabs later
// import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
// import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';

export default function TeamDashboard() {
  const { token } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  // Get ID from hash URL (e.g. #/team/5)
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

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header Section */}
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
          <Button variant="outline">&larr; Back to Dashboard</Button>
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b mb-6 overflow-x-auto">
        {['profile', 'yearly', 'goals', 'competitions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
          <Card>
            <CardHeader><CardTitle>Team Profile</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <label className="text-xs font-bold text-gray-500 uppercase">Partner A</label>
                        <p className="text-lg font-medium text-gray-900">
                            {team.partner_a_details?.full_name}
                        </p>
                        <a href={`#/skater/${team.partner_a}`} className="text-xs text-brand-blue hover:underline mt-1 block">View Individual Profile &rarr;</a>
                    </div>
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <label className="text-xs font-bold text-gray-500 uppercase">Partner B</label>
                        <p className="text-lg font-medium text-gray-900">
                            {team.partner_b_details?.full_name}
                        </p>
                        <a href={`#/skater/${team.partner_b}`} className="text-xs text-brand-blue hover:underline mt-1 block">View Individual Profile &rarr;</a>
                    </div>
                </div>
                {/* We will add Management Actions (Archive Team) here later */}
            </CardContent>
          </Card>
        )}

        {/* Placeholders */}
        {activeTab !== 'profile' && (
           <div className="text-center p-12 border-2 border-dashed rounded-lg bg-white">
            <h3 className="text-lg font-medium">{activeTab.toUpperCase()}</h3>
            <p className="text-muted-foreground">Team features coming next.</p>
          </div>
        )}
      </div>
    </div>
  );
}