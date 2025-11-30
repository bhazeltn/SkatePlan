import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, ArrowLeft, Trash2, UserCheck, Eye, Lock } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { InviteUserModal } from '@/components/dashboard/InviteUserModal';

// Tabs
import { SynchroRosterTab } from '@/components/dashboard/tabs/SynchroRosterTab';
import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
import { GoalsTab } from '@/components/dashboard/tabs/GoalsTab';
import { ProgramsTab } from '@/components/dashboard/tabs/ProgramsTab';
import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';
import { LogsTab } from '@/components/dashboard/tabs/LogsTab';
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { AnalyticsTab } from '@/components/dashboard/tabs/AnalyticsTab';
import { GapAnalysisTab } from '@/components/dashboard/tabs/GapAnalysisTab';
import { LogisticsTab } from '@/components/dashboard/tabs/LogisticsTab';
import { SynchroProfileTab } from '@/components/dashboard/tabs/SynchroProfileTab';

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

  if (loading) return <div className="p-8">Loading team...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  // --- PERMISSIONS LOGIC ---
  const accessLevel = team.access_level || 'COACH';
  
  const isObserver = accessLevel === 'VIEWER' || accessLevel === 'OBSERVER';
  const isCollaborator = accessLevel === 'COLLABORATOR';
  const isOwner = accessLevel === 'COACH' || accessLevel === 'OWNER' || accessLevel === 'MANAGER';
  
  // "Edit Access" means Owner or Collaborator
  const hasEditAccess = isOwner || isCollaborator;

  const permissions = {
      role: user?.role,
      canEditPlan: hasEditAccess,
      canEditGoals: hasEditAccess,
      canEditLogs: hasEditAccess,
      canEditHealth: hasEditAccess,
      canCreateCompetitions: hasEditAccess,
      canEditCompetitions: hasEditAccess, // Observers can't edit team results
      canDelete: isOwner, // Only Owner can delete
      viewGapAnalysis: hasEditAccess || isObserver, 
      readOnly: !hasEditAccess       
  };
  // ------------------------

  const handleRevoke = async (accessId) => {
      if (!confirm("Revoke access?")) return;
      try {
          await apiRequest(`/access/${accessId}/revoke/`, 'DELETE', null, token);
          fetchTeam();
      } catch (e) { alert("Failed."); }
  };

  const tabs = ['roster', 'yearly', 'gap_analysis', 'goals', 'programs', 'competitions', 'logistics', 'logs', 'health', 'analytics', 'profile'];
  const formatTabLabel = (str) => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 border-2 border-white shadow-sm"><Users className="h-8 w-8" /></div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.team_name}</h1>
                <div className="flex gap-3 text-sm text-muted-foreground mt-1 items-center">
                    <FederationFlag federation={team.federation} />
                    <span className="border-l pl-3 ml-1">Synchro ({team.level})</span>
                    
                    {/* STATUS BADGES */}
                    {isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase">Collaborating</span>}
                    {isObserver && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">Observer Mode</span>}
                </div>
                
                {/* STAFF LIST (Hidden for Observer) */}
                {!isObserver && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {team.collaborators && team.collaborators.map(c => (
                            <div key={c.id} className="flex items-center gap-1 text-xs bg-white border border-purple-100 px-2 py-1 rounded-full text-purple-700">
                                <UserCheck className="h-3 w-3" /> 
                                <span className="font-bold mr-1">{c.role}:</span> {c.full_name}
                                {isOwner && (
                                    <button onClick={() => handleRevoke(c.id)} className="ml-1 text-purple-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                                )}
                            </div>
                        ))}
                        {team.observers && team.observers.map(c => (
                             <div key={c.id} className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                                <Eye className="h-3 w-3" /> 
                                <span className="font-bold mr-1">Observer:</span> {c.full_name}
                                {isOwner && (
                                    <button onClick={() => handleRevoke(c.id)} className="ml-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex gap-2">
            <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></a>
            {isOwner && (
                <InviteUserModal 
                    entityType="SynchroTeam" entityId={team.id} entityName={team.team_name}
                    trigger={<Button variant="outline">Invite Staff</Button>}
                />
            )}
        </div>
      </div>

      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{formatTabLabel(tab)}</button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* PASS PERMISSIONS & READONLY TO ALL TABS */}
        {activeTab === 'roster' && <SynchroRosterTab team={team} readOnly={permissions.readOnly} />}
        {activeTab === 'yearly' && <YearlyPlansTab isSynchro={true} team={team} readOnly={permissions.readOnly} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab isSynchro={true} team={team} readOnly={permissions.readOnly} />}
        {activeTab === 'goals' && <GoalsTab isSynchro={true} team={team} permissions={permissions} />}
        {activeTab === 'programs' && <ProgramsTab isSynchro={true} team={team} readOnly={permissions.readOnly} permissions={permissions} />}
        {activeTab === 'competitions' && <CompetitionsTab isSynchro={true} team={team} readOnly={permissions.readOnly} permissions={permissions} />}
        {activeTab === 'logistics' && <LogisticsTab isSynchro={true} team={team} readOnly={permissions.readOnly} />}
        {activeTab === 'logs' && <LogsTab isSynchro={true} team={team} permissions={permissions} />}
        {activeTab === 'health' && <HealthTab isSynchro={true} team={team} permissions={permissions} />}
        {activeTab === 'analytics' && <AnalyticsTab isSynchro={true} team={team} />}
        {activeTab === 'profile' && <SynchroProfileTab team={team} onUpdated={fetchTeam} readOnly={!permissions.canDelete} />} 
      </div>
    </div>
  );
}