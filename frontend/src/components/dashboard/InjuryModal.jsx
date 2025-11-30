import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { AlertTriangle, Lock } from 'lucide-react';

export function InjuryModal({ skater, team, isSynchro, injuryToEdit, onSaved, trigger, permissions }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fields
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [onset, setOnset] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [severity, setSeverity] = useState('Mild');
  const [notes, setNotes] = useState('');
  
  const [selectedSkaterId, setSelectedSkaterId] = useState('');

  // Permissions
  const canDelete = permissions?.canDelete;
  // If permissions prop exists, use canEditHealth, otherwise default true (for safety in older contexts)
  const canEdit = permissions ? permissions.canEditHealth : true; 
  
  // Effective Read Only
  const isReadOnly = !canEdit;

  useEffect(() => {
      if (open) {
          if (injuryToEdit) {
              setType(injuryToEdit.injury_type);
              setArea(injuryToEdit.body_area);
              setOnset(injuryToEdit.date_of_onset);
              setReturnDate(injuryToEdit.return_to_sport_date || '');
              setStatus(injuryToEdit.recovery_status);
              setSeverity(injuryToEdit.severity || 'Mild');
              setNotes(injuryToEdit.recovery_notes || '');
              setSelectedSkaterId(injuryToEdit.skater);
          } else {
              setType(''); setArea(''); setOnset(new Date().toISOString().split('T')[0]);
              setReturnDate(''); setStatus('Active'); setSeverity('Mild'); setNotes('');
              if (skater) setSelectedSkaterId(skater.id);
              else if (team && !isSynchro && team.partner_a_details) setSelectedSkaterId(team.partner_a_details.id);
          }
      }
  }, [open, injuryToEdit, skater, team]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (isReadOnly) return;
      setLoading(true);
      
      const payload = {
          injury_type: type,
          body_area: area,
          date_of_onset: onset,
          return_to_sport_date: returnDate || null,
          severity: severity,
          recovery_status: status,
          recovery_notes: notes,
          skater_id: selectedSkaterId
      };

      try {
          if (injuryToEdit) {
              await apiRequest(`/injuries/${injuryToEdit.id}/`, 'PATCH', payload, token);
          } else if (isSynchro) {
              await apiRequest(`/synchro/${team.id}/injuries/`, 'POST', payload, token);
          } else if (team) {
              await apiRequest(`/teams/${team.id}/injuries/`, 'POST', payload, token);
          } else {
              await apiRequest(`/skaters/${skater.id}/injuries/`, 'POST', payload, token);
          }
          
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) {
          alert("Failed to save injury record.");
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = async () => {
      if (!confirm("Delete this injury record?")) return;
      setLoading(true);
      try {
          await apiRequest(`/injuries/${injuryToEdit.id}/`, 'DELETE', null, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch(e) { alert("Failed to delete."); }
      finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (!isReadOnly && <Button variant="destructive" className="bg-red-600 hover:bg-red-700"><AlertTriangle className="h-4 w-4 mr-2" /> Report Injury</Button>)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                {injuryToEdit ? 'Update Injury' : 'Report Injury'}
                {isReadOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> View Only</span>}
            </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {team && !injuryToEdit && (
                <div className="space-y-2">
                    <Label>Athlete</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedSkaterId} onChange={(e) => setSelectedSkaterId(e.target.value)} required disabled={isReadOnly}>
                        <option value="">Select Athlete...</option>
                        {isSynchro && team.roster ? (
                            team.roster.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)
                        ) : team.partner_a_details ? (
                            <>
                                <option value={team.partner_a_details.id}>{team.partner_a_details.full_name}</option>
                                <option value={team.partner_b_details.id}>{team.partner_b_details.full_name}</option>
                            </>
                        ) : null}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Injury Type</Label><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Sprained Ankle" required disabled={isReadOnly} /></div>
                <div className="space-y-2"><Label>Body Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Right Ankle" required disabled={isReadOnly} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date of Onset</Label><DatePicker date={onset} setDate={setOnset} disabled={isReadOnly} /></div>
                <div className="space-y-2"><Label>Severity</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={isReadOnly}><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Status</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isReadOnly}><option value="Active">Active</option><option value="Recovering">Recovering</option><option value="Resolved">Resolved</option></select></div>
                <div className="space-y-2"><Label>Return to Sport (Est)</Label><DatePicker date={returnDate} setDate={setReturnDate} disabled={isReadOnly} /></div>
            </div>

            <div className="space-y-2"><Label>Recovery Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Physio instructions, limitations..." disabled={isReadOnly} /></div>

            {!isReadOnly && (
                <DialogFooter className="flex justify-between items-center">
                    {injuryToEdit && canDelete ? ( 
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>Delete</Button>
                    ) : <div></div>}
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Record'}</Button>
                </DialogFooter>
            )}
        </form>
      </DialogContent>
    </Dialog>
  );
}