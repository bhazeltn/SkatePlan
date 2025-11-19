import React, { useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditSkaterModal } from '@/components/dashboard/EditSkaterModal';
import { EditDisciplineModal } from '@/components/dashboard/EditDisciplineModal';
import { EditSafetyModal } from '@/components/dashboard/EditSafetyModal';

export function ProfileTab({ skater, onUpdated }) {
  const { token } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // --- HANDLERS (Moved from Dashboard) ---
  const handleArchive = async () => {
    try {
      const newState = !skater.is_active;
      await apiRequest(`/skaters/${skater.id}/`, 'PATCH', { is_active: newState }, token);
      onUpdated(); // Refresh parent data
    } catch (err) {
      alert("Failed to update archive status.");
    }
  };

  const handleDelete = async () => {
    try {
      await apiRequest(`/skaters/${skater.id}/`, 'DELETE', null, token);
      window.location.hash = '#/'; // Redirect to roster
    } catch (err) {
      alert("Failed to delete profile.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile & Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* 1. Personal Information */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h4 className="text-md font-semibold text-gray-900">Personal Information</h4>
              <EditSkaterModal skater={skater} onSkaterUpdated={onUpdated} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg font-medium">{skater.full_name}</p>
             </div>
             <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-lg">{skater.date_of_birth}</p>
             </div>
             <div>
                <label className="text-sm font-medium text-muted-foreground">Gender</label>
                <p className="text-lg">{skater.gender || 'Not set'}</p>
             </div>
             <div>
                <label className="text-sm font-medium text-muted-foreground">Home Club/Rink</label>
                <p className="text-lg">{skater.home_club || 'Not set'}</p>
             </div>
             <div>
                <label className="text-sm font-medium text-muted-foreground">Federation</label>
                <div className="flex items-center gap-2 mt-1">
                  {skater.federation ? (
                      <>
                          <span className="text-2xl">{skater.federation.flag_emoji}</span>
                          <p className="text-lg">{skater.federation.name}</p>
                      </>
                  ) : (
                      <p className="text-lg text-muted-foreground">Not set</p>
                  )}
                </div>
             </div>
          </div>
        </section>

        {/* 2. Safety & Contact */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h4 className="text-md font-semibold text-gray-900">Safety & Contact</h4>
              <EditSafetyModal skater={skater} onUpdated={onUpdated} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-red-50 border border-red-100 rounded-md">
                  <h5 className="text-sm font-semibold text-red-800 mb-2">Medical Notes</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {skater.profile?.relevant_medical_notes || "No notes recorded."}
                  </p>
              </div>
              
              <div className="space-y-3">
                   <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Emergency Contact</label>
                      <p className="font-medium">
                          {skater.profile?.emergency_contact_name || "--"} 
                          <span className="text-gray-500 font-normal ml-2">
                              {skater.profile?.emergency_contact_phone}
                          </span>
                      </p>
                   </div>
                   <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Guardian</label>
                      <p className="font-medium">
                          {skater.profile?.guardian_name || "--"}
                          <span className="text-gray-500 font-normal ml-2">
                              {skater.profile?.guardian_email}
                          </span>
                      </p>
                   </div>
              </div>
          </div>
        </section>

        {/* 3. Disciplines */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h4 className="text-md font-semibold text-gray-900">Disciplines</h4>
            <Button variant="outline" size="sm">Add Discipline +</Button>
          </div>
          
          {skater.planning_entities && skater.planning_entities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skater.planning_entities.map((entity) => (
                <div key={entity.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{entity.name}</p>
                    {entity.current_level && <p className="text-sm text-muted-foreground">{entity.current_level}</p>}
                  </div>
                  <EditDisciplineModal entity={entity} onUpdated={onUpdated} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No active disciplines.</p>
            </div>
          )}
        </section>

        {/* 4. Danger Zone */}
        <section className="pt-4">
          <h4 className="text-md font-semibold mb-4 text-red-600 border-b pb-2 border-red-100">Danger Zone</h4>
          <div className="flex gap-4">
             <Button 
               variant="outline" 
               className="text-gray-600"
               onClick={handleArchive}
             >
               {skater.is_active ? 'Archive Athlete' : 'Unarchive Athlete'}
             </Button>

             <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete Profile</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete {skater.full_name}?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete this athlete profile, all their plans, logs, and goals. 
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
                  </DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        </section>
        
      </CardContent>
    </Card>
  );
}