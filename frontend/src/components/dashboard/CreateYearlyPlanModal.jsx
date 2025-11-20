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
import { DatePicker } from '@/components/ui/date-picker';

export function CreateYearlyPlanModal({ skater, onPlanCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Basic Form State
  const [selectedValue, setSelectedValue] = useState('');
  const [peakType, setPeakType] = useState('Single Peak');
  const [seasonGoal, setSeasonGoal] = useState('');

  // Season Logic State
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonMode, setSelectedSeasonMode] = useState('current'); // 'current', 'id', 'new'
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  
  // New Season Fields
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Fetch available seasons when modal opens
  useEffect(() => {
    if (open && skater) {
      const fetchSeasons = async () => {
        try {
          const data = await apiRequest(`/skaters/${skater.id}/seasons/`, 'GET', null, token);
          setSeasons(data || []);
          
          // Default to the most recent season if available
          if (data && data.length > 0) {
             const latest = data[data.length - 1];
             setSelectedSeasonId(latest.id);
             setSelectedSeasonMode('id');
          } else {
             setSelectedSeasonMode('new'); // No seasons? Force create.
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchSeasons();
      
      // Auto-fill next season name
      const nextYear = new Date().getFullYear() + 1;
      setNewSeasonName(`${nextYear}-${nextYear + 1}`);
    }
  }, [open, skater, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedValue) return alert("Please select a discipline.");

    const [entityId, entityType] = selectedValue.split('|');
    setLoading(true);

    try {
      const payload = {
        planning_entity_id: entityId,
        planning_entity_type: entityType,
        peak_type: peakType,
        primary_season_goal: seasonGoal,
      };

      // Attach Season Data
      if (selectedSeasonMode === 'new') {
         payload.new_season_data = {
            season: newSeasonName,
            start_date: newStartDate,
            end_date: newEndDate
         };
      } else if (selectedSeasonMode === 'id') {
         payload.season_id = selectedSeasonId;
      }
      
      await apiRequest(`/skaters/${skater.id}/ytps/`, 'POST', payload, token);
      
      onPlanCreated(); 
      setOpen(false);
      
      // Reset
      setSeasonGoal('');
    } catch (err) {
      alert('Failed to create plan. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Plan</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Yearly Training Plan</DialogTitle>
          <DialogDescription>
            Define the goals and timeline for this plan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Season Selection */}
          <div className="p-3 bg-slate-50 border rounded-md space-y-3">
            <Label>Season</Label>
            <select
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={selectedSeasonMode}
                onChange={(e) => setSelectedSeasonMode(e.target.value)}
            >
                {seasons.length > 0 && <option value="id">Use Existing Season</option>}
                <option value="new">Create New Season...</option>
            </select>

            {selectedSeasonMode === 'id' && seasons.length > 0 && (
               <select
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
               >
                 {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                        {s.season} ({s.start_date} - {s.end_date})
                    </option>
                 ))}
               </select>
            )}

            {selectedSeasonMode === 'new' && (
               <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <Label className="text-xs text-muted-foreground">Season Name</Label>
                    <Input value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="2026-2027" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                        <DatePicker date={newStartDate} setDate={setNewStartDate} />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">End Date</Label>
                        <DatePicker date={newEndDate} setDate={setNewEndDate} />
                    </div>
                  </div>
               </div>
            )}
          </div>

          {/* 2. Discipline */}
          <div className="space-y-2">
            <Label>Discipline</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              required
            >
              <option value="">Select Discipline...</option>
              {skater?.planning_entities?.map((entity) => (
                <option key={entity.id} value={`${entity.id}|${entity.type}`}>
                  {entity.name} ({entity.current_level || 'No Level'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Peak Type */}
          <div className="space-y-2">
            <Label>Peaking Strategy</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={peakType}
              onChange={(e) => setPeakType(e.target.value)}
            >
              <option value="Single Peak">Single Peak</option>
              <option value="Double Peak">Double Peak</option>
              <option value="Triple Peak">Triple Peak</option>
              <option value="Development">Development</option>
            </select>
          </div>

          {/* 4. Goal */}
          <div className="space-y-2">
            <Label>Primary Season Goal</Label>
            <Input 
              placeholder="e.g. Qualify for Nationals" 
              value={seasonGoal}
              onChange={(e) => setSeasonGoal(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Start Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}