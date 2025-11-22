import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { DatePicker } from '@/components/ui/date-picker'; 

export function GoalModal({ planId, skaterId, teamId, goal, onSaved, trigger }) {
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
        } else {
            setTitle('');
            setType('Outcome');
            setTimeframe('Season');
            setDescription('');
            setStatus('IN_PROGRESS');
            setStartDate('');
            setTargetDate('');
        }
    }
  }, [open, goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title,
        goal_type: type,
        goal_timeframe: timeframe,
        smart_description: description,
        current_status: status,
        start_date: startDate || null,
        target_date: targetDate || null,
      };

      if (goal) {
        await apiRequest(`/goals/${goal.id}/`, 'PATCH', payload, token);
      } else {
        // --- DYNAMIC CREATION ENDPOINT ---
        if (teamId) {
             await apiRequest(`/teams/${teamId}/goals/`, 'POST', payload, token);
        } else if (planId) {
            await apiRequest(`/ytps/${planId}/goals/`, 'POST', payload, token);
        } else if (skaterId) {
            await apiRequest(`/skaters/${skaterId}/goals/`, 'POST', payload, token);
        }
        // ---------------------------------
      }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      alert('Failed to save goal.');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-2"><Label>Goal Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Qualify for Nationals" required /></div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Start Date</Label><DatePicker date={startDate} setDate={setStartDate} placeholder="Start" /></div>
             <div className="space-y-2"><Label>Target Date</Label><DatePicker date={targetDate} setDate={setTargetDate} placeholder="Deadline" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}><option value="Outcome">Outcome</option><option value="Technical">Technical</option><option value="Process">Process</option></select></div>
              <div className="space-y-2"><Label>Timeframe</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}><option value="Short Term">Short Term</option><option value="Season">Season</option><option value="Long Term">Long Term</option></select></div>
          </div>

          {goal && (
            <div className="space-y-2"><Label>Status</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="DRAFT">Draft</option><option value="PENDING">Pending Approval</option><option value="APPROVED">Approved</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></div>
          )}

          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          
          <DialogFooter className="flex justify-between items-center">
            {goal && <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">Delete</Button>}
            <Button type="submit" disabled={loading}>Save Goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}