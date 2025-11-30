import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Trash2, UserCheck, Eye, Handshake } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { useAccessControl } from '@/hooks/useAccessControl';

import { InviteUserModal } from '@/features/profiles/components/InviteUserModal';

// Tabs
import { SynchroRosterTab } from '@/features/profiles/components/SynchroRosterTab';
import { SynchroProfileTab } from '@/features/profiles/components/SynchroProfileTab';
import { WeeklyPlanTab } from '@/features/planning/components/WeeklyPlanTab';
import { YearlyPlansTab } from '@/features/planning/components/YearlyPlansTab';
import { GapAnalysisTab } from '@/features/planning/components/GapAnalysisTab';
import { GoalsTab } from '@/features/performance/components/GoalsTab';
import { ProgramsTab } from '@/features/performance/components/ProgramsTab';
import { CompetitionsTab } from '@/features/performance/components/CompetitionsTab';
import { AnalyticsTab } from '@/features/performance/components/AnalyticsTab';
import { LogsTab } from '@/features/health/components/LogsTab';
import { HealthTab } from '@/features/health/components/HealthTab';
import { LogisticsTab } from '@/features/logistics/components/LogisticsTab';

export default function SynchroTeamDashboard() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/synchro/${id}/`, 'GET', null, token);
      setTeam(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, [id, token]);

  const perms = useAccessControl(team);

  if (loading) return <div className="p-8">Loading team...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  // --- TAB LOGIC ---
  const tabs = ['roster']; // Everyone sees Roster
  
  if (perms.canViewYearlyPlan) tabs.push('yearly');
  if (perms.canViewGapAnalysis) tabs.push('gap_analysis');
  if (perms.canViewPerformance) tabs.push('goals', 'programs', 'competitions');
  
  if (perms.canViewLogistics) tabs.push('logistics');
  
  if (perms.canViewHealth) tabs.push('logs', 'health', 'analytics');
  
  tabs.push('profile'); // Everyone sees Profile (permissions handle editability)

  const formatTabLabel = (str) => str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 border-2 border-white shadow-sm"><Users className="h-8 w-8" /></div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.team_name}</h1>
                <div className="flex items-center gap-3 text-muted-foreground mt-1">
                    <FederationFlag federation={team.federation} />
                    <span className="border-l pl-3 ml-1">Synchro ({team.level})</span>
                    
                    {perms.isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase flex items-center gap-1"><Handshake className="h-3 w-3"/> Collaborating</span>}
                    {perms.isManager && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase flex items-center gap-1"><Briefcase className="h-3 w-3"/> Manager</span>}
                    {perms.isObserver && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase flex items-center gap-1"><Eye className="h-3 w-3"/> Observer</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></a>
        </div>
      </div>

      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{formatTabLabel(tab)}</button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'roster' && <SynchroRosterTab team={team} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'yearly' && <YearlyPlansTab isSynchro={true} team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab isSynchro={true} team={team} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'goals' && <GoalsTab isSynchro={true} team={team} permissions={perms} />}
        {activeTab === 'programs' && <ProgramsTab isSynchro={true} team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'competitions' && <CompetitionsTab isSynchro={true} team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'logistics' && <LogisticsTab isSynchro={true} team={team} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'logs' && <LogsTab isSynchro={true} team={team} permissions={perms} />}
        {activeTab === 'health' && <HealthTab isSynchro={true} team={team} permissions={perms} />}
        {activeTab === 'analytics' && <AnalyticsTab isSynchro={true} team={team} />}
        
        {activeTab === 'profile' && <SynchroProfileTab team={team} onUpdated={fetchTeam} readOnly={!perms.canDelete} />}
      </div>
    </div>
  );
}