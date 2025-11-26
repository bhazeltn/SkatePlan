import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditSkaterModal } from '@/components/dashboard/EditSkaterModal';
import { EditDisciplineModal } from '@/components/dashboard/EditDisciplineModal';
import { InviteUserModal } from '@/components/dashboard/InviteUserModal';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { AlertTriangle, Mail } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';

export function ProfileTab({ skater, onUpdated }) {
  const { token } = useAuth();

  const handleDelete = async () => {
      if (!confirm("Delete this athlete profile? This cannot be undone.")) return;
      try {
          await apiRequest(`/skaters/${skater.id}/`, 'DELETE', null, token);
          window.location.hash = '#/';
      } catch (e) { alert("Failed."); }
  };

  // --- AGE HELPER ---
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
  // ------------------

  return (
    <div className="space-y-6">
      
      {/* Main Info */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Athlete Details</CardTitle>
            <div className="flex gap-2">
                {/* 1. INVITE PARENT (Always Active) */}
                <InviteUserModal 
                    entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                    skaterDOB={skater.date_of_birth} hasGuardian={skater.has_guardian}
                    defaultRole="PARENT"
                    lockRole={true} 
                    trigger={<Button size="sm" variant="outline">Invite Parent</Button>}
                />

                {/* 2. INVITE ATHLETE (Disabled if < 13) */}
                <InviteUserModal 
                    entityType="Skater" entityId={skater.id} entityName={skater.full_name}
                    skaterDOB={skater.date_of_birth} hasGuardian={skater.has_guardian}
                    defaultRole="ATHLETE"
                    lockRole={true}
                    trigger={
                        <Button 
                            size="sm" 
                            variant="outline" 
                            disabled={isYoungMinor} // <--- DISABLE HERE
                            title={isYoungMinor ? "Direct access not available for athletes under 13." : ""}
                        >
                            Invite Athlete
                        </Button>
                    }
                />
                
                <EditSkaterModal skater={skater} onSaved={onUpdated} />
            </div>
        </CardHeader>
        
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><p className="text-lg">{skater.full_name}</p></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">DOB</label><p className="text-lg">{skater.date_of_birth} <span className="text-gray-400 text-sm">({age}yo)</span></p></div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Federation</label>
                <div className="mt-1"><FederationFlag federation={skater.federation} /></div>
            </div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Home Club</label><p className="text-lg">{skater.home_club || '-'}</p></div>
            
            {/* Account Status */}
            <div className="md:col-span-2 pt-4 border-t">
                <label className="text-xs font-bold text-gray-500 uppercase">User Account</label>
                {skater.user_account ? (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-gray-900">Active: {skater.user_account.email || "Linked"}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 rounded-full bg-gray-300" />
                        <span className="text-sm text-gray-500 italic">
                            {isYoungMinor ? "Minor Account (Parent Only)." : "No user account linked."}
                        </span>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      {/* Disciplines */}
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
                      <EditDisciplineModal entity={entity} onSaved={onUpdated} />
                  </div>
              ))}
          </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-100">
          <CardHeader className="bg-red-50/50 border-b border-red-100"><CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
          <CardContent className="p-6 flex justify-between items-center">
              <div className="text-sm text-gray-600"><p className="font-medium text-gray-900">Delete Athlete</p><p>Permanently remove this profile and all data.</p></div>
              <Button variant="destructive" onClick={handleDelete}>Delete Profile</Button>
          </CardContent>
      </Card>
    </div>
  );
}