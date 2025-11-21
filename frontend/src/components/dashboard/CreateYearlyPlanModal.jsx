import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { AlertCircle } from 'lucide-react';

export function CreateYearlyPlanModal({ skater, team, onPlanCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // Form State
  const [selectedValue, setSelectedValue] = useState(''); 
  const [peakType, setPeakType] = useState('Single Peak');
  const [seasonGoal, setSeasonGoal] = useState('');

  // Season Logic
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonMode, setSelectedSeasonMode] = useState('current'); 
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  useEffect(() => {
    if (open) {
      setError(null);
      
      // 1. Initialize Discipline Selection
      if (team) {
          // If Team, value is fixed (Team ID | 'Team')
          setSelectedValue(`${team.id}|Team`);
      } else if (skater?.planning_entities?.length > 0) {
          // If Skater, default to first
          const def = skater.planning_entities[0];
          setSelectedValue(`${def.id}|${def.type}`);
      }

      // 2. Fetch Seasons (Only for Individual Skaters for now)
      // For Teams, merging two season lists is complex, so we default to "Create New" or just list Partner A's.
      // Simplest MVP: If Team, force "Create New / Manual Name" or fetch Partner A.
      const fetchTargetId = team ? team.partner_a : skater?.id;
      
      if (fetchTargetId) {
          const fetchSeasons = async () => {
            try {
              const data = await apiRequest(`/skaters/${fetchTargetId}/seasons/`, 'GET', null, token);
              setSeasons(data || []);
              if (data && data.length > 0) {
                 setSelectedSeasonId(data[data.length - 1].id);
                 setSelectedSeasonMode('id');
              } else {
                 setSelectedSeasonMode('new'); 
              }
            } catch (e) { console.error(e); }
          };
          fetchSeasons();
      }

      // Auto-fill next season name
      const nextYear = new Date().getFullYear() + 1;
      setNewSeasonName(`${nextYear}-${nextYear + 1}`);
    }
  }, [open, skater, team, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedValue) return setError("Please select a discipline.");

    // Validation
    if (selectedSeasonMode === 'new') {
        if (!newSeasonName) return setError("Please enter a season name.");
        // Dates are optional but recommended
    }

    const [entityId, entityType] = selectedValue.split('|');
    setLoading(true);

    try {
      const payload = {
        planning_entity_id: entityId,
        planning_entity_type: entityType,
        peak_type: peakType,
        primary_season_goal: seasonGoal,
      };

      if (selectedSeasonMode === 'new') {
         payload.new_season_data = { season: newSeasonName, start_date: newStartDate, end_date: newEndDate };
      } else if (selectedSeasonMode === 'id') {
         payload.season_id = selectedSeasonId;
      }
      
      // Dynamic URL
      const url = team ? `/teams/${team.id}/ytps/` : `/skaters/${skater.id}/ytps/`;
      
      await apiRequest(url, 'POST', payload, token);
      
      if (onPlanCreated) onPlanCreated();
      setOpen(false);
      setSeasonGoal('');
    } catch (err) {
      let msg = err.message || 'Failed to create plan.';
      if (msg.includes('[')) msg = msg.replace(/[\[\]"]/g, '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Create New Plan</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Yearly Plan {team ? `for ${team.team_name}` : ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4" /> <p>{error}</p>
            </div>
          )}

          {/* 1. Season */}
          <div className="p-3 bg-slate-50 border rounded-md space-y-3">
            <Label>Season</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={selectedSeasonMode} onChange={(e) => setSelectedSeasonMode(e.target.value)}>
                {seasons.length > 0 && <option value="id">Use Existing ({seasons[seasons.length-1]?.season})</option>}
                <option value="new">Create / Define New Season...</option>
            </select>

            {selectedSeasonMode === 'id' && seasons.length > 0 && (
               <select className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}>
                 {seasons.map(s => (<option key={s.id} value={s.id}>{s.season}</option>))}
               </select>
            )}

            {selectedSeasonMode === 'new' && (
               <div className="space-y-2">
                  <div><Label className="text-xs text-muted-foreground">Season Name</Label><Input value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="2026-2027" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs text-muted-foreground">Start</Label><DatePicker date={newStartDate} setDate={setNewStartDate} /></div>
                    <div><Label className="text-xs text-muted-foreground">End</Label><DatePicker date={newEndDate} setDate={setNewEndDate} /></div>
                  </div>
               </div>
            )}
          </div>

          {/* 2. Discipline (Only show if Skater, hide if Team) */}
          {!team && (
              <div className="space-y-2">
                <Label>Discipline</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)}>
                  {skater?.planning_entities?.map((entity) => (
                    <option key={entity.id} value={`${entity.id}|${entity.type}`}>{entity.name} ({entity.current_level || 'No Level'})</option>
                  ))}
                </select>
              </div>
          )}

          {/* 3. Peak & Goal */}
          <div className="space-y-2">
            <Label>Peaking Strategy</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={peakType} onChange={(e) => setPeakType(e.target.value)}>
              <option value="Single Peak">Single Peak</option><option value="Double Peak">Double Peak</option><option value="Triple Peak">Triple Peak</option><option value="Development">Development</option>
            </select>
          </div>
          <div className="space-y-2"><Label>Primary Goal</Label><Input value={seasonGoal} onChange={(e) => setSeasonGoal(e.target.value)} placeholder="Qualify for..." required /></div>

          <DialogFooter><Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Start Plan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}