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

export function MacrocycleModal({ planId, macrocycle, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focus, setFocus] = useState('');

  // Populate form on edit
  useEffect(() => {
    if (open) {
        setTitle(macrocycle?.phase_title || '');
        setStartDate(macrocycle?.phase_start || '');
        setEndDate(macrocycle?.phase_end || '');
        setFocus(macrocycle?.phase_focus || '');
    }
  }, [open, macrocycle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        phase_title: title,
        phase_start: startDate,
        phase_end: endDate,
        phase_focus: focus
      };

      if (macrocycle) {
        // Edit Mode
        await apiRequest(`/macrocycles/${macrocycle.id}/`, 'PATCH', payload, token);
      } else {
        // Create Mode
        await apiRequest(`/ytps/${planId}/macrocycles/`, 'POST', payload, token);
      }
      
      onSaved();
      setOpen(false);
      // Only reset if creating
      if (!macrocycle) {
          setTitle(''); setStartDate(''); setEndDate(''); setFocus('');
      }
    } catch (err) {
      alert('Failed to save phase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">Add Phase</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{macrocycle ? 'Edit Phase' : 'Add Season Phase'}</DialogTitle>
          <DialogDescription>Define a block of training time (Macrocycle).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Phase Name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. General Prep" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primary Focus</Label>
            <Textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={focus} 
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Volume, Skills Acquisition..."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}