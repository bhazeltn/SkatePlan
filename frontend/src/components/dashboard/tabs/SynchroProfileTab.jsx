import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InviteUserModal } from '@/components/dashboard/InviteUserModal';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { AlertTriangle, Users, Trash2, Eye, UserCheck } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';
import { EditSynchroTeamModal } from '../EditSynchroTeamModal';

export function SynchroProfileTab({ team, onUpdated, readOnly }) {
  const { token } = useAuth();

  const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
      try {
          await apiRequest(`/synchro/${team.id}/`, 'DELETE', null, token);
          window.location.hash = '#/';
      } catch (e) { alert("Failed."); }
  };

  const handleRevoke = async (accessId) => {
      if (!confirm("Revoke access for this user?")) return;
      try {
          await apiRequest(`/access/${accessId}/revoke/`, 'DELETE', null, token);
          if (onUpdated) onUpdated();
      } catch (e) { alert("Failed to revoke access."); }
  };

  return (
    <div className="space-y-6">
      
      {/* Team Details Card */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center pb-4 border-b">
            <CardTitle>Team Profile</CardTitle>
            
            {!readOnly && (
                <div className="flex gap-2">
                    <InviteUserModal 
                        entityType="SynchroTeam" entityId={team.id} entityName={team.team_name}
                        defaultRole="OBSERVER"
                        trigger={<Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-2" /> Invite Observer</Button>}
                    />
                    <InviteUserModal 
                        entityType="SynchroTeam" entityId={team.id} entityName={team.team_name}
                        defaultRole="COLLABORATOR"
                        trigger={<Button size="sm" variant="outline"><Users className="h-4 w-4 mr-2" /> Invite Staff</Button>}
                    />
                    <EditSynchroTeamModal team={team} onSaved={onUpdated} />
                </div>
            )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Team Name</label><p className="text-lg">{team.team_name}</p></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Level</label><p className="text-lg">{team.level}</p></div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Federation</label>
                    <div className="mt-1"><FederationFlag federation={team.federation} /></div>
                </div>
            </div>

            {/* Staff & Observers */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Team Access</h4>
                </div>
                
                <div className="p-4 space-y-4">
                    
                    {/* Coaching Staff */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                        <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900 mt-1">
                            <Users className="h-4 w-4 text-indigo-500" /> Coaching Staff
                        </div>
                        <div className="flex-1 space-y-2">
                            {team.collaborators && team.collaborators.length > 0 ? (
                                team.collaborators.map((collab) => (
                                    <div key={collab.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{collab.full_name}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded uppercase">{collab.role}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-gray-400 text-xs hidden sm:inline">{collab.email}</span>
                                            {!readOnly && (
                                                <button onClick={() => handleRevoke(collab.id)} className="text-gray-400 hover:text-red-600" title="Revoke Access"><Trash2 className="h-4 w-4" /></button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : <span className="text-sm text-gray-400 italic">No additional staff linked</span>}
                        </div>
                    </div>

                    {/* Observers (Only Owner sees this) */}
                    {!readOnly && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pt-4 border-t border-slate-200">
                            <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900 mt-1">
                                <Eye className="h-4 w-4 text-slate-500" /> Observers
                            </div>
                            <div className="flex-1 space-y-2">
                                {team.observers && team.observers.length > 0 ? (
                                    team.observers.map((obs) => (
                                        <div key={obs.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{obs.full_name}</span>
                                                <span className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded uppercase">Observer</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-gray-400 text-xs hidden sm:inline">{obs.email}</span>
                                                <button onClick={() => handleRevoke(obs.id)} className="text-gray-400 hover:text-red-600" title="Revoke Access"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                ) : <span className="text-sm text-gray-400 italic">No observers linked</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </CardContent>
      </Card>

      {/* Danger Zone */}
      {!readOnly && (
          <Card className="border-red-100">
              <CardHeader className="bg-red-50/50 border-b border-red-100"><CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
              <CardContent className="p-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">Delete Team</p><p>Permanently remove this team and all data.</p></div>
                  <Button variant="destructive" onClick={handleDelete}>Delete Team</Button>
              </CardContent>
          </Card>
      )}
    </div>
  );
}