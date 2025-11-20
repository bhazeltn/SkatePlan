import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { AlertTriangle } from 'lucide-react';

export function InjuryModal({ skater, injury, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Form State
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [onset, setOnset] = useState(new Date().toISOString().split('T')[0]);
  
  // NEW: Return Date
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
            
            // Load existing return date
            setReturnDate(injury.return_to_sport_date || '');
            
            setSeverity(injury.severity || 'Mild');
            setStatus(injury.recovery_status || 'Active');
            setNotes(injury.recovery_notes || '');
        } else {
            // Reset
            setType('');
            setArea('');
            setOnset(new Date().toISOString().split('T')[0]);
            setReturnDate(''); // Default to empty
            setSeverity('Mild');
            setStatus('Active');
            setNotes('');
        }
    }
  }, [open, injury]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        injury_type: type,
        body_area: area.split(',').map(s => s.trim()),
        date_of_onset: onset,
        
        // Send Date or Null
        return_to_sport_date: returnDate || null,
        
        severity,
        recovery_status: status,
        recovery_notes: notes,
      };

      if (injury) {
        await apiRequest(`/injuries/${injury.id}/`, 'PATCH', payload, token);
      } else {
        await apiRequest(`/skaters/${skater.id}/injuries/`, 'POST', payload, token);
      }
      
      onSaved();
      setOpen(false);
    } catch (err) {
      alert('Failed to save injury record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button variant="destructive" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Injury
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{injury ? 'Update Status' : 'Report Injury'}</DialogTitle>
          <DialogDescription>Log a new physical issue or update recovery status.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Row 1: Type & Area */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Injury Type</Label>
                <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Sprain" required />
            </div>
            <div className="space-y-2">
                <Label>Body Area</Label>
                <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Ankle" required />
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Date of Onset</Label>
                <DatePicker date={onset} setDate={setOnset} />
             </div>
             
             {/* --- NEW FIELD --- */}
             <div className="space-y-2">
                <Label>Return to Sport (Est.)</Label>
                <DatePicker date={returnDate} setDate={setReturnDate} placeholder="Optional" />
             </div>
             {/* ----------------- */}
          </div>

          {/* Row 3: Severity & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Severity</Label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                >
                    <option value="Mild">Mild (Training Modified)</option>
                    <option value="Moderate">Moderate (Limited Training)</option>
                    <option value="Severe">Severe (Off Ice Only)</option>
                    <option value="Critical">Critical (No Activity)</option>
                </select>
            </div>
            <div className="space-y-2">
                <Label>Status</Label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="Active">Active / Injured</option>
                    <option value="Recovering">Recovering / Return to Sport</option>
                    <option value="Resolved">Resolved / Fully Cleared</option>
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Medical / Recovery Notes</Label>
            <Textarea 
                className="min-h-[80px]"
                placeholder="Physio instructions, pain levels, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} variant={injury ? "default" : "destructive"}>
              {loading ? 'Saving...' : 'Save Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}