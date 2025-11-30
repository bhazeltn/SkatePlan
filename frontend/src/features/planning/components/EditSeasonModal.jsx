import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Pencil } from 'lucide-react';

export function EditSeasonModal({ season, onUpdated, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // FIX: Sync state with the passed 'season' prop whenever it changes or modal opens
  useEffect(() => {
    if (season) {
        setName(season.season || '');
        setStart(season.start_date || '');
        setEnd(season.end_date || '');
    }
  }, [season, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!season || !season.id) {
        alert("Error: Cannot identify season to edit.");
        return;
    }

    setLoading(true);
    try {
        await apiRequest(`/seasons/${season.id}/`, 'PATCH', {
            season: name,
            start_date: start,
            end_date: end
        }, token);
        
        if (onUpdated) onUpdated();
        setOpen(false);
    } catch (e) {
        alert("Failed to update season.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Edit Season Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Season Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2024-2025" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <DatePicker date={start} setDate={setStart} />
                </div>
                <div className="space-y-2">
                    <Label>End Date</Label>
                    <DatePicker date={end} setDate={setEnd} />
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}