import React, { useState } from 'react';
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

export function CreateYearlyPlanModal({ skater, onPlanCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Form State
  const [selectedValue, setSelectedValue] = useState(''); // New state for combined ID|Type
  const [peakType, setPeakType] = useState('Single Peak');
  const [seasonGoal, setSeasonGoal] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedValue) return alert("Please select a discipline.");

    // Split the combined value back into ID and Type
    const [entityId, entityType] = selectedValue.split('|');

    setLoading(true);
    try {
      const payload = {
        planning_entity_id: entityId,     // Send ID
        planning_entity_type: entityType, // Send Type
        peak_type: peakType,
        primary_season_goal: seasonGoal
      };
      
      await apiRequest(`/skaters/${skater.id}/ytps/`, 'POST', payload, token);
      
      onPlanCreated(); 
      setOpen(false);
      
      // Reset
      setSeasonGoal('');
      setSelectedValue('');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Yearly Training Plan</DialogTitle>
          <DialogDescription>
            Start a new season plan for a specific discipline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Discipline Selector */}
          <div className="space-y-2">
            <Label>Discipline</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              required
            >
              <option value="">Select Discipline...</option>
              {skater?.planning_entities?.map((entity) => (
                // We combine ID and Type into the value string
                <option key={entity.id} value={`${entity.id}|${entity.type}`}>
                  {entity.name} ({entity.current_level || 'No Level'})
                </option>
              ))}
            </select>
          </div>

          {/* Peak Type */}
          <div className="space-y-2">
            <Label>Peaking Strategy</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={peakType}
              onChange={(e) => setPeakType(e.target.value)}
            >
              <option value="Single Peak">Single Peak (One major event)</option>
              <option value="Double Peak">Double Peak (e.g. Sectionals & Nationals)</option>
              <option value="Triple Peak">Triple Peak</option>
              <option value="Development">Development (No specific peak)</option>
            </select>
          </div>

          {/* Primary Goal */}
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