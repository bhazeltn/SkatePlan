import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, AlertTriangle, Handshake, Briefcase, Eye, UserCheck, Trash2 } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { EditTeamModal } from '@/features/profiles/components/EditTeamModal';
import { InviteUserModal } from '@/features/profiles/components/InviteUserModal';
import { useAccessControl } from '@/hooks/useAccessControl';

// Tabs
import { YearlyPlansTab } from '@/features/planning/components/YearlyPlansTab';
import { GoalsTab } from '@/features/performance/components/GoalsTab';
import { ProgramsTab } from '@/features/performance/components/ProgramsTab';
import { CompetitionsTab } from '@/features/performance/components/CompetitionsTab';
import { LogsTab } from '@/features/health/components/LogsTab';
import { HealthTab } from '@/features/health/components/HealthTab';
import { AnalyticsTab } from '@/features/performance/components/AnalyticsTab';
import { GapAnalysisTab } from '@/features/planning/components/GapAnalysisTab';
import { LogisticsTab } from '@/features/logistics/components/LogisticsTab';
import { WeeklyPlanTab } from '@/features/planning/components/WeeklyPlanTab';

export default function TeamDashboard() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('goals');
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/teams/${id}/`, 'GET', null, token);
      setTeam(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, [id, token]);

  // --- PERMISSIONS ---
  const perms = useAccessControl(team);
  // -------------------

  const handleRevoke = async (accessId) => {
      if (!confirm("Revoke access?")) return;
      try {
          await apiRequest(`/access/${accessId}/revoke/`, 'DELETE', null, token);
          fetchTeam();
      } catch (e) { alert("Failed."); }
  };

  const handleDelete = async () => {
      if (!confirm(`Delete ${team.team_name}?`)) return;
      try { await apiRequest(`/teams/${id}/`, 'DELETE', null, token); window.location.hash = '#/'; } catch (e) { alert("Failed."); }
  };

  const formatTabLabel = (str) => str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (loading) return <div className="p-8">Loading...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  const tabs = ['weekly'];
  if (perms.canViewYearlyPlan) tabs.push('yearly');
  if (perms.canViewGapAnalysis) tabs.push('gap_analysis');
  if (perms.canViewPerformance) tabs.push('goals', 'programs', 'competitions');
  if (perms.canViewLogistics) tabs.push('logistics');
  if (perms.canViewHealth) tabs.push('logs', 'health', 'analytics');
  tabs.push('profile');

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm"><Users className="h-8 w-8" /></div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.team_name}</h1>
                <div className="flex items-center gap-3 text-muted-foreground mt-1">
                    {/* FIX: Use team.name for "Ice Dance" instead of "ICE_DANCE" */}
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                        {team.name}
                    </span>
                    <span>{team.current_level}</span>
                    <FederationFlag federation={team.federation} />

                    {/* BADGES */}
                    {perms.isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase flex items-center gap-1"><Handshake className="h-3 w-3"/> Collaborating</span>}
                    {perms.isManager && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase flex items-center gap-1"><Briefcase className="h-3 w-3"/> Manager</span>}
                    {perms.isObserver && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase flex items-center gap-1"><Eye className="h-3 w-3"/> Observer</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button></a>
        </div>
      </div>

      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{formatTabLabel(tab)}</button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'weekly' && <WeeklyPlanTab team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'yearly' && <YearlyPlansTab team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab team={team} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'goals' && <GoalsTab team={team} permissions={perms} />}
        {activeTab === 'programs' && <ProgramsTab team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'competitions' && <CompetitionsTab team={team} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'logistics' && <LogisticsTab team={team} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'logs' && <LogsTab team={team} permissions={perms} />}
        {activeTab === 'health' && <HealthTab team={team} permissions={perms} />}
        {activeTab === 'analytics' && <AnalyticsTab team={team} />}
        
        {activeTab === 'profile' && (
          <div className="space-y-8">
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Team Details</CardTitle>
                    {/* Invite/Edit only for Owner/Staff who can edit Profile */}
                    {perms.canEditProfile && (
                        <div className="flex gap-2">
                            <InviteUserModal entityType="Team" entityId={team.id} entityName={team.team_name} trigger={<Button size="sm" variant="outline">Invite Staff</Button>} />
                            <EditTeamModal team={team} onSaved={fetchTeam} />
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg bg-slate-50"><label className="text-xs font-bold text-gray-500 uppercase">Partner A</label><p className="text-lg font-medium">{team.partner_a_details?.full_name}</p><a href={`#/skater/${team.partner_a}`} className="text-xs text-brand-blue hover:underline block mt-1">View Profile &rarr;</a></div>
                        <div className="p-4 border rounded-lg bg-slate-50"><label className="text-xs font-bold text-gray-500 uppercase">Partner B</label><p className="text-lg font-medium">{team.partner_b_details?.full_name}</p><a href={`#/skater/${team.partner_b}`} className="text-xs text-brand-blue hover:underline block mt-1">View Profile &rarr;</a></div>
                    </div>
                    {/* Staff List */}
                    <div className="border-t pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Access List</h4>
                        <div className="flex flex-wrap gap-2">
                            {[...(team.collaborators || []), ...(team.observers || [])].map(c => (
                                <div key={c.id} className="flex items-center gap-1 text-xs bg-white border px-2 py-1 rounded-full">
                                    <UserCheck className="h-3 w-3" /> <span className="font-bold mr-1">{c.role}:</span> {c.full_name}
                                    {perms.isOwner && <button onClick={() => handleRevoke(c.id)} className="ml-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
              </Card>
              {perms.canDelete && (
                <Card className="border-red-100">
                  <CardHeader className="bg-red-50/50 border-b border-red-100"><CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
                  <CardContent className="p-6 flex justify-between items-center">
                      <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">Delete this team</p><p>This action cannot be undone.</p></div>
                      <Button variant="destructive" onClick={handleDelete}>Delete Team</Button>
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </div>
    </div>
  );
}