import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // <--- Added
import { Users, ArrowLeft, AlertTriangle, Handshake, Briefcase, Eye, UserCheck, Trash2, Mail, ChevronDown, Shield, User, Archive } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { EditTeamModal } from '@/features/profiles/components/EditTeamModal';
import { InviteUserModal } from '@/features/profiles/components/InviteUserModal';
import { useAccessControl } from '@/hooks/useAccessControl';

// Tabs (Keep existing imports)
import { YearlyPlansTab } from '@/features/planning/components/YearlyPlansTab';
import { GoalsTab } from '@/features/performance/components/GoalsTab';
import { ProgramsTab } from '@/features/performance/components/ProgramsTab';
import { CompetitionsTab } from '@/features/performance/components/CompetitionsTab';
import { LogsTab } from '@/features/health/components/LogsTab';
import { HealthTab } from '@/features/health/components/HealthTab';
import { AnalyticsTab } from '@/features/performance/components/AnalyticsTab';
import { GapAnalysisTab } from '@/features/planning/components/GapAnalysisTab';
import { WeeklyPlanTab } from '@/features/planning/components/WeeklyPlanTab';

export default function TeamDashboard() {
  // ... (Fetch logic remains same) ...
  const { id } = useParams();
  const location = useLocation();
  const { token, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');
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

  useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      if (tab) setActiveTab(tab);
  }, [location.search]);

  const perms = useAccessControl(team);

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
  
  const handleArchive = async () => {
      const action = team.is_active ? 'archive' : 'restore';
      if (!confirm(`Change status to ${action}?`)) return;
      try {
          await apiRequest(`/teams/${team.id}/`, 'PATCH', { is_active: !team.is_active }, token);
          fetchTeam();
      } catch (e) { alert("Failed."); }
  };

  const formatTabLabel = (str) => str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (loading) return <div className="p-8">Loading...</div>;
  if (!team) return <div className="p-8">Team not found.</div>;

  const tabs = ['weekly'];
  if (perms.canViewYearlyPlan) tabs.push('yearly');
  if (perms.canViewGapAnalysis) tabs.push('gap_analysis');
  if (perms.canViewPerformance) tabs.push('goals', 'programs', 'competitions');
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
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{team.name}</span>
                    <span>{team.current_level}</span>
                    <FederationFlag federation={team.federation} />
                    {perms.isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase flex items-center gap-1"><Handshake className="h-3 w-3"/> Collaborating</span>}
                    {perms.isObserver && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase flex items-center gap-1"><Eye className="h-3 w-3"/> Observer</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></a>
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
        {activeTab === 'logs' && <LogsTab team={team} permissions={perms} />}
        {activeTab === 'health' && <HealthTab team={team} permissions={perms} />}
        {activeTab === 'analytics' && <AnalyticsTab team={team} />}
        
        {activeTab === 'profile' && (
          <div className="space-y-8">
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Team Details</CardTitle>
                    {perms.isOwner && (
                        <div className="flex gap-2">
                             <Popover>
                                <PopoverTrigger asChild><Button size="sm" variant="outline"><Mail className="h-4 w-4 mr-2" /> Invite... <ChevronDown className="h-3 w-3 ml-1 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent align="end" className="w-56 p-1">
                                    <div className="flex flex-col gap-1">
                                        <InviteUserModal entityType="Team" entityId={team.id} entityName={team.team_name} defaultRole="OBSERVER" lockRole={true} trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Eye className="h-4 w-4 mr-2 text-amber-500" /> Observer</Button>} />
                                        <InviteUserModal entityType="Team" entityId={team.id} entityName={team.team_name} defaultRole="COLLABORATOR" lockRole={true} trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Users className="h-4 w-4 mr-2 text-indigo-500" /> Assistant Coach</Button>} />
                                        <div className="h-px bg-slate-100 my-1" />
                                        <InviteUserModal entityType="Team" entityId={team.id} entityName={team.team_name} defaultRole="PARENT" lockRole={true} trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Shield className="h-4 w-4 mr-2 text-slate-500" /> Team Parent</Button>} />
                                        <InviteUserModal entityType="Team" entityId={team.id} entityName={team.team_name} defaultRole="ATHLETE" lockRole={true} trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><User className="h-4 w-4 mr-2 text-blue-500" /> Athlete</Button>} />
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <EditTeamModal team={team} onSaved={fetchTeam} />
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg bg-slate-50"><label className="text-xs font-bold text-gray-500 uppercase">Partner A</label><p className="text-lg font-medium">{team.partner_a_details?.full_name}</p><a href={`#/skater/${team.partner_a}`} className="text-xs text-brand-blue hover:underline block mt-1">View Profile &rarr;</a></div>
                        <div className="p-4 border rounded-lg bg-slate-50"><label className="text-xs font-bold text-gray-500 uppercase">Partner B</label><p className="text-lg font-medium">{team.partner_b_details?.full_name}</p><a href={`#/skater/${team.partner_b}`} className="text-xs text-brand-blue hover:underline block mt-1">View Profile &rarr;</a></div>
                    </div>
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
                  <CardHeader className="bg-red-50/50 border-b border-red-100"><CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Management</CardTitle></CardHeader>
                  <CardContent className="p-6 flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-red-50 pb-4">
                          <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">{team.is_active ? 'Archive Team' : 'Restore Team'}</p><p>Move to the bottom of your list.</p></div>
                          <Button variant="outline" onClick={handleArchive}><Archive className="h-4 w-4 mr-2" /> {team.is_active ? 'Archive' : 'Restore'}</Button>
                      </div>
                      <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">Delete Team</p><p>Permanently remove this team.</p></div>
                          <Button variant="destructive" onClick={handleDelete}>Delete Team</Button>
                      </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </div>
    </div>
  );
}