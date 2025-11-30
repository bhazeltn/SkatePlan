import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
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
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Outcome');
  const [timeframe, setTimeframe] = useState('Season');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // --- PERMISSIONS ---
  // 1. Can I Edit? (Observer = False, Everyone Else = True)
  const canEdit = permissions?.canEditGoals;
  
  // 2. Can I Delete? (Owner = True, Everyone Else = False)
  const canDelete = permissions?.canDelete;

  // 3. Is this a Coach? (For Status Locking logic)
  const isCoachRole = permissions?.role === 'COACH' || permissions?.role === 'COLLABORATOR';

  // 4. Is the Goal Locked? (Approved/Completed goals are locked for Non-Coaches)
  const isLockedStatus = !isCoachRole && goal && ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].includes(goal.current_status);

  // 5. Effective Read Only State
  const isReadOnly = !canEdit || isLockedStatus;
  // -------------------

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
            // entity ID is not editable on existing goals
        } else {
            setTitle('');
            setType('Outcome');
            setTimeframe('Season');
            setDescription('');
            setStatus('IN_PROGRESS');
            setStartDate('');
            setTargetDate('');
            
            // Default Entity Selection (for Skaters with multiple disciplines)
            if (skater?.planning_entities?.length > 0) {
                setSelectedEntityId(skater.planning_entities[0].id);
            }
        }
    }
  }, [open, goal, skater]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setLoading(true);
    
    const payload = {
      title,
      goal_type: type,
      goal_timeframe: timeframe,
      smart_description: description,
      current_status: status,
      start_date: startDate ? startDate : null,
      target_date: targetDate ? targetDate : null,
      planning_entity_id: selectedEntityId 
    };

    try {
      if (goal) {
        await apiRequest(`/goals/${goal.id}/`, 'PATCH', payload, token);
      } else {
        if (isSynchro) await apiRequest(`/synchro/${teamId}/goals/`, 'POST', payload, token);
        else if (teamId) await apiRequest(`/teams/${teamId}/goals/`, 'POST', payload, token);
        else if (planId) await apiRequest(`/ytps/${planId}/goals/`, 'POST', payload, token);
        else if (skater) await apiRequest(`/skaters/${skater.id}/goals/`, 'POST', payload, token);
      }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      // Handle backend permission/validation errors nicely
      let msg = "Failed to save goal.";
      if (err.message && err.message.includes("cannot edit")) msg = err.message;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this goal?")) return;
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
        {trigger || (canEdit && <Button size="sm" variant="outline">Add Goal</Button>)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              {goal ? 'Edit Goal' : 'Add Goal'}
              {isReadOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> {canEdit ? 'Locked' : 'View Only'}</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Discipline Selector (Create Only) */}
          {!goal && skater && skater.planning_entities && skater.planning_entities.length > 1 && (
              <div className="space-y-2">
                  <Label>Discipline / Context</Label>
                  <select 
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
                      disabled={isReadOnly}
                  >
                      {skater.planning_entities.map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.name} ({ent.current_level || 'No Level'})</option>
                      ))}
                  </select>
              </div>
          )}

          <div className="space-y-2">
              <Label>Goal Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Qualify for Nationals" required disabled={isReadOnly} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Start Date</Label><DatePicker date={startDate} setDate={setStartDate} placeholder="Start" disabled={isReadOnly} /></div>
             <div className="space-y-2"><Label>Target Date</Label><DatePicker date={targetDate} setDate={setTargetDate} placeholder="Deadline" disabled={isReadOnly} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Type</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)} disabled={isReadOnly}>
                      <option value="Outcome">Outcome</option><option value="Technical">Technical</option><option value="Process">Process</option>
                  </select>
              </div>
              <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={isReadOnly}>
                      <option value="Short Term">Short Term</option><option value="Season">Season</option><option value="Long Term">Long Term</option>
                  </select>
              </div>
          </div>

          {/* Status - Only Coaches can change (unless creating new) */}
          {goal && (
            <div className="space-y-2">
                <Label>Status</Label>
                <select 
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!isCoachRole} // Strict: Only coach changes status
                >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                </select>
                {!isCoachRole && <p className="text-[10px] text-muted-foreground">Only a coach can update status.</p>}
            </div>
          )}

          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isReadOnly} /></div>
          
          {/* Metadata Footer */}
          {goal && (
              <div className="text-[10px] text-gray-400 border-t pt-2 mt-4 flex justify-between">
                  <span>Created by {goal.created_by_name}</span>
                  <span>Updated by {goal.updated_by_name}</span>
              </div>
          )}

          {/* Footer Actions - Conditionally Rendered */}
          <DialogFooter className="flex justify-between items-center">
            {/* DELETE: Only if canDelete is true */}
            {goal && canDelete ? (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">Delete</Button>
            ) : <div></div>}

            {/* SAVE: Only if not ReadOnly */}
            {!isReadOnly && (
                <Button type="submit" disabled={loading}>Save Goal</Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}