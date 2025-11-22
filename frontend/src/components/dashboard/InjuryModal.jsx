import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { AlertTriangle } from 'lucide-react';

export function InjuryModal({ skater, team, isSynchro, injury, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // If Team, user must select who. If Skater, it's fixed.
  const [selectedSkaterId, setSelectedSkaterId] = useState(skater?.id || '');
  
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [onset, setOnset] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');
  const [severity, setSeverity] = useState('Mild');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
        if (injury) {
            setType(injury.injury_type || '');
            setArea(injury.body_area ? injury.body_area.join(', ') : '');
            setOnset(injury.date_of_onset || '');
            setReturnDate(injury.return_to_sport_date || '');
            setSeverity(injury.severity || 'Mild');
            setStatus(injury.recovery_status || 'Active');
            setNotes(injury.recovery_notes || '');
            setSelectedSkaterId(injury.skater); // Backend returns ID
        } else {
            // Reset
            setType(''); setArea('');
            setOnset(new Date().toISOString().split('T')[0]); setReturnDate('');
            setSeverity('Mild'); setStatus('Active'); setNotes('');
            // If Team, reset selection (force user to pick)
            if (team) setSelectedSkaterId('');
        }
    }
  }, [open, injury, team]);

  const rosterSource = isSynchro ? team.roster : (team ? [team.partner_a_details, team.partner_b_details] : []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSkaterId) return alert("Please select the injured skater.");

    setLoading(true);
    try {
      const payload = {
        injury_type: type,
        body_area: area.split(',').map(s => s.trim()),
        date_of_onset: onset,
        return_to_sport_date: returnDate || null,
        severity,
        recovery_status: status,
        recovery_notes: notes,
        skater_id: selectedSkaterId // <--- Send ID
      };

      if (injury) {
            await apiRequest(`/injuries/${injury.id}/`, 'PATCH', payload, token);
        } else if (isSynchro) {
            await apiRequest(`/synchro/${team.id}/injuries/`, 'POST', payload, token);
        } else if (team) {
            await apiRequest(`/teams/${team.id}/injuries/`, 'POST', payload, token);
        } else {
            await apiRequest(`/skaters/${skater.id}/injuries/`, 'POST', payload, token);
        }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) { alert('Failed to save injury.'); } 
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" /> Report Injury</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{injury ? 'Update Status' : 'Report Injury'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TEAM SELECTOR */}
          {team && !injury && (
              <div className="space-y-2">
                  <Label>Who is injured?</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedSkaterId} onChange={(e) => setSelectedSkaterId(e.target.value)} required>
                      <option value="">Select Skater...</option>
                      {isSynchro 
                        ? team.roster?.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)
                        : (
                            <>
                                <option value={team.partner_a}>{team.partner_a_details?.full_name}</option>
                                <option value={team.partner_b}>{team.partner_b_details?.full_name}</option>
                            </>
                        )
                      }
                  </select>
              </div>
          )}

          {/* ... (Rest of Fields: Type, Area, Dates, Severity, Notes - Keep Same) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Injury Type</Label><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Sprain" required /></div>
            <div className="space-y-2"><Label>Body Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Ankle" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Date of Onset</Label><DatePicker date={onset} setDate={setOnset} /></div>
             <div className="space-y-2"><Label>Return (Est.)</Label><DatePicker date={returnDate} setDate={setReturnDate} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Severity</Label><select className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
            <div className="space-y-2"><Label>Status</Label><select className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="Active">Active</option><option value="Recovering">Recovering</option><option value="Resolved">Resolved</option></select></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          
          <DialogFooter><Button type="submit" disabled={loading} variant="destructive">{loading ? 'Saving...' : 'Save Record'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}