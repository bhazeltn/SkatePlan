import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { DatePicker } from '@/components/ui/date-picker'; 
import { Lock } from 'lucide-react';

export function GoalModal({ planId, skater, teamId, isSynchro, goal, onSaved, trigger, permissions }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Outcome');
  const [timeframe, setTimeframe] = useState('Season');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  // Discipline Selection (for Multi-Discipline Skaters)
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const isCoach = permissions?.role === 'COACH' || permissions?.role === 'COLLABORATOR';
  const canEdit = permissions?.canEditGoals; // False for Observer
  const canDelete = permissions?.canDelete;  // False for Observer/Parent
  
  // If goal is approved/active and user is not coach, it is locked
  const isLocked = !isCoach && goal && ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].includes(goal.current_status);

  useEffect(() => {
    if (open) {
        if (goal) {
            setTitle(goal.title || '');
            setType(goal.goal_type || 'Outcome');
            setTimeframe(goal.goal_timeframe || 'Season');
            setDescription(goal.smart_description || '');
            setStatus(goal.current_status || 'IN_PROGRESS');
            setStartDate(goal.start_date || '');
            setTargetDate(goal.target_date || '');
            // We don't set entity ID here because we can't move a goal between entities easily
        } else {
            setTitle('');
            setType('Outcome');
            setTimeframe('Season');
            setDescription('');
            setStatus('IN_PROGRESS');
            setStartDate('');
            setTargetDate('');
            
            // Default Entity Selection
            if (skater?.planning_entities?.length > 0) {
                setSelectedEntityId(skater.planning_entities[0].id);
            }
        }
    }
  }, [open, goal, skater]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      title,
      goal_type: type,
      goal_timeframe: timeframe,
      smart_description: description,
      current_status: status,
      start_date: startDate ? startDate : null,
      target_date: targetDate ? targetDate : null,
      planning_entity_id: selectedEntityId // Send chosen discipline
    };

    try {
      if (goal) {
        await apiRequest(`/goals/${goal.id}/`, 'PATCH', payload, token);
      } else {
        if (isSynchro) {
             await apiRequest(`/synchro/${teamId}/goals/`, 'POST', payload, token);
        } else if (teamId) {
             await apiRequest(`/teams/${teamId}/goals/`, 'POST', payload, token);
        } else if (planId) {
            await apiRequest(`/ytps/${planId}/goals/`, 'POST', payload, token);
        } else if (skater) {
            await apiRequest(`/skaters/${skater.id}/goals/`, 'POST', payload, token);
        }
      }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      // Handle backend validation error for locked goals
      let msg = "Failed to save goal.";
      if (err.message && err.message.includes("cannot edit")) msg = err.message;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    setLoading(true);
    try {
        await apiRequest(`/goals/${goal.id}/`, 'DELETE', null, token);
        if (onSaved) onSaved();
        setOpen(false);
    } catch(err) {
        alert("Failed to delete goal.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline">Add Goal</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              {goal ? 'Edit Goal' : 'Add Goal'}
              {isLocked && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> Locked by Coach</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* DISCIPLINE SELECTOR (Only on Create for Skaters) */}
          {!goal && skater && skater.planning_entities && skater.planning_entities.length > 1 && (
              <div className="space-y-2">
                  <Label>Discipline / Context</Label>
                  <select 
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                      {skater.planning_entities.map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.name} ({ent.current_level || 'No Level'})</option>
                      ))}
                  </select>
              </div>
          )}

          <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Qualify for Nationals" required disabled={isLocked} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Start Date</Label><DatePicker date={startDate} setDate={setStartDate} placeholder="Start" disabled={isLocked} /></div>
             <div className="space-y-2"><Label>Target Date</Label><DatePicker date={targetDate} setDate={setTargetDate} placeholder="Deadline" disabled={isLocked} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Type</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)} disabled={isLocked}>
                      <option value="Outcome">Outcome</option><option value="Technical">Technical</option><option value="Process">Process</option>
                  </select>
              </div>
              <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={isLocked}>
                      <option value="Short Term">Short Term</option><option value="Season">Season</option><option value="Long Term">Long Term</option>
                  </select>
              </div>
          </div>

          {/* Status - Only Coach can change if already approved, or on Edit */}
          {goal && (
            <div className="space-y-2">
                <Label>Status</Label>
                <select 
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!isCoach} // Strict: Only coach changes status
                >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
            </div>
          )}

          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isLocked} /></div>
          
          {/* METADATA FOOTER */}
          {goal && (
              <div className="text-[10px] text-gray-400 border-t pt-2 mt-4 flex justify-between">
                  <span>Created by {goal.created_by_name}</span>
                  <span>Updated by {goal.updated_by_name}</span>
              </div>
          )}

          <DialogFooter className="flex justify-between items-center">
            {goal && !isLocked && <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">Delete</Button>}
            {!isLocked && <Button type="submit" disabled={loading}>Save Goal</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}