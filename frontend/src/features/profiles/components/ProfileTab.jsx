import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // <--- Added Popover
import { FederationFlag } from '@/components/ui/FederationFlag';
import { AlertTriangle, Shield, User, Mail, Users, Trash2, Eye, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';

// Sibling Imports (Files in the same folder)
import { EditSkaterModal } from './EditSkaterModal';
import { EditDisciplineModal } from './EditDisciplineModal';
import { InviteUserModal } from './InviteUserModal';

export function ProfileTab({ skater, onUpdated, readOnly, permissions }) {
  const { token } = useAuth();

  const handleDelete = async () => {
      if (!confirm("Delete this athlete profile? This cannot be undone.")) return;
      try {
          await apiRequest(`/skaters/${skater.id}/`, 'DELETE', null, token);
          window.location.hash = '#/';
      } catch (e) { alert("Failed."); }
  };

  const handleRevoke = async (accessId) => {
      if (!confirm("Revoke access for this user? They will no longer see this athlete.")) return;
      try {
          await apiRequest(`/access/${accessId}/revoke/`, 'DELETE', null, token);
          if (onUpdated) onUpdated();
      } catch (e) {
          alert("Failed to revoke access.");
      }
  };

  const getAge = (dobString) => {
      if (!dobString) return 18; 
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
      return age;
  };

  const age = getAge(skater.date_of_birth);
  const isYoungMinor = age < 13;
  const hasGuardian = skater.guardians && skater.guardians.length > 0;

  // Permission: Can invite? (Owner Only)
  const canInvite = permissions ? permissions.canEditProfile : !readOnly;

  return (
    <div className="space-y-6">
      
      {/* Main Info */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center pb-4 border-b">
            <CardTitle>Athlete Details</CardTitle>
            
            {!readOnly && (
                <div className="flex gap-2">
                    
                    {/* CONSOLIDATED INVITE MENU */}
                    {canInvite && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <Mail className="h-4 w-4 mr-2" /> Invite... <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-1">
                                <div className="flex flex-col gap-1">
                                    <InviteUserModal 
                                        entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                                        defaultRole="OBSERVER"
                                        trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Eye className="h-4 w-4 mr-2 text-amber-500" /> Observer</Button>}
                                    />

                                    <InviteUserModal 
                                        entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                                        defaultRole="COLLABORATOR"
                                        trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Users className="h-4 w-4 mr-2 text-indigo-500" /> Coach / Staff</Button>}
                                    />

                                    <div className="h-px bg-slate-100 my-1" />

                                    <InviteUserModal 
                                        entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                                        skaterDOB={skater.date_of_birth} hasGuardian={skater.guardians?.length > 0}
                                        defaultRole="GUARDIAN"
                                        lockRole={true} 
                                        trigger={<Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9"><Shield className="h-4 w-4 mr-2 text-green-600" /> Parent/Guardian</Button>}
                                    />

                                    <InviteUserModal 
                                        entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                                        skaterDOB={skater.date_of_birth} hasGuardian={skater.guardians?.length > 0}
                                        defaultRole="ATHLETE"
                                        lockRole={true}
                                        trigger={
                                            <Button variant="ghost" size="sm" className="w-full justify-start font-normal h-9" disabled={isYoungMinor}>
                                                <User className="h-4 w-4 mr-2 text-blue-500" /> Athlete
                                            </Button>
                                        }
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    
                    <EditSkaterModal skater={skater} onSkaterUpdated={onUpdated} />
                </div>
            )}
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><p className="text-lg">{skater.full_name}</p></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">DOB</label><p className="text-lg">{skater.date_of_birth} <span className="text-gray-400 text-sm">({age}yo)</span></p></div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Federation</label>
                    <div className="mt-1"><FederationFlag federation={skater.federation} /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Home Club</label><p className="text-lg">{skater.home_club || '-'}</p></div>
            </div>

            {/* ACCOUNT CONNECTIONS */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Linked Accounts</h4>
                </div>
                
                <div className="p-4 space-y-4">
                    
                    {/* 1. Athlete Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                        <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900">
                            <User className="h-4 w-4 text-blue-500" /> Athlete
                        </div>
                        <div className="flex-1">
                            {isYoungMinor ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Restricted (Under 13)
                                </span>
                            ) : skater.user_account_email ? (
                                <span className="font-mono text-sm text-gray-700">{skater.user_account_email}</span>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-400 italic">Not Linked</span>
                                    {!readOnly && canInvite && (
                                        <InviteUserModal 
                                            entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                                            skaterDOB={skater.date_of_birth} hasGuardian={hasGuardian}
                                            defaultRole="ATHLETE"
                                            lockRole={true}
                                            trigger={<Button size="sm" variant="link" className="h-auto p-0">Invite</Button>}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Guardian Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
                        <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900 mt-1">
                            <Shield className="h-4 w-4 text-green-600" /> Parent/Guardian
                        </div>
                        <div className="flex-1 space-y-2">
                            {hasGuardian ? (
                                skater.guardians.map((g, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <span className="font-medium text-gray-900">{g.full_name}</span>
                                        <span className="text-gray-400">&bull;</span>
                                        <span className="font-mono text-gray-600">{g.email}</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">None linked</span>
                            )}
                        </div>
                    </div>

                    {/* 3. Collaborators Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pt-4 border-t border-slate-200">
                        <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900 mt-1">
                            <Users className="h-4 w-4 text-indigo-500" /> Coaching Staff
                        </div>
                        <div className="flex-1 space-y-2">
                            {skater.collaborators && skater.collaborators.length > 0 ? (
                                skater.collaborators.map((collab) => (
                                    <div key={collab.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{collab.full_name}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded uppercase">{collab.role}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-gray-400 text-xs hidden sm:inline">{collab.email}</span>
                                            {!readOnly && permissions?.canManageStaff && (
                                                <button 
                                                    onClick={() => handleRevoke(collab.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">No additional staff linked</span>
                            )}
                        </div>
                    </div>

                    {/* 4. Observers Row (Owner Only) */}
                    {!readOnly && permissions?.canManageStaff && ( 
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pt-4 border-t border-slate-200">
                            <div className="w-32 flex items-center gap-2 text-sm font-medium text-gray-900 mt-1">
                                <Eye className="h-4 w-4 text-amber-500" /> Observers
                            </div>
                            <div className="flex-1 space-y-2">
                                {skater.observers && skater.observers.length > 0 ? (
                                    skater.observers.map((obs) => (
                                        <div key={obs.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{obs.full_name}</span>
                                                <span className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded uppercase">Observer</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-gray-400 text-xs hidden sm:inline">{obs.email}</span>
                                                <button 
                                                    onClick={() => handleRevoke(obs.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400 italic">No observers linked</span>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </CardContent>
      </Card>
      
      {/* Disciplines Card */}
      <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Disciplines & Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              {skater.planning_entities?.map(entity => (
                  <div key={entity.id} className="flex justify-between items-center p-3 border rounded hover:bg-slate-50">
                      <div>
                          <span className="font-bold text-gray-900">{entity.name}</span>
                          <span className="ml-2 text-sm text-gray-500">{entity.current_level}</span>
                      </div>
                      {!readOnly && <EditDisciplineModal entity={entity} onUpdated={onUpdated} />}
                  </div>
              ))}
          </CardContent>
      </Card>

      {/* Danger Zone - Only if canDelete (Owner) */}
      {!readOnly && permissions?.canDelete && (
          <Card className="border-red-100">
              <CardHeader className="bg-red-50/50 border-b border-red-100"><CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
              <CardContent className="p-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">Delete Athlete</p><p>Permanently remove this profile and all data.</p></div>
                  <Button variant="destructive" onClick={handleDelete}>Delete Profile</Button>
              </CardContent>
          </Card>
      )}
    </div>
  );
}