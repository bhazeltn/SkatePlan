import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { DatePicker } from '@/components/ui/date-picker'; 
import { Plus, Zap, Palette, Dumbbell, Brain, Lock } from 'lucide-react';

export function MacrocycleModal({ planId, macrocycle, onSaved, defaultStartDate, defaultEndDate, trigger, readOnly }) { // <--- Added readOnly
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // ... (State init remains the same) ...
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focus, setFocus] = useState('');
  const [techFocus, setTechFocus] = useState('');
  const [compFocus, setCompFocus] = useState('');
  const [physFocus, setPhysFocus] = useState('');
  const [mentFocus, setMentFocus] = useState('');

  useEffect(() => {
    if (open) {
        if (macrocycle) {
            setTitle(macrocycle.phase_title);
            setStartDate(macrocycle.phase_start);
            setEndDate(macrocycle.phase_end);
            setFocus(macrocycle.phase_focus || '');
            setTechFocus(macrocycle.technical_focus || '');
            setCompFocus(macrocycle.component_focus || '');
            setPhysFocus(macrocycle.physical_focus || '');
            setMentFocus(macrocycle.mental_focus || '');
        } else {
            setTitle('');
            setStartDate(defaultStartDate || '');
            setEndDate(defaultEndDate || '');
            setFocus('');
            setTechFocus(''); setCompFocus(''); setPhysFocus(''); setMentFocus('');
        }
    }
  }, [open, macrocycle, defaultStartDate, defaultEndDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return; // Guard
    
    setLoading(true);
    // ... (Payload logic remains same)
    const payload = {
        phase_title: title,
        phase_start: startDate,
        phase_end: endDate,
        phase_focus: focus,
        technical_focus: techFocus,
        component_focus: compFocus,
        physical_focus: physFocus,
        mental_focus: mentFocus
    };

    try {
      if (macrocycle) {
        await apiRequest(`/macrocycles/${macrocycle.id}/`, 'PATCH', payload, token);
      } else {
        await apiRequest(`/ytps/${planId}/macrocycles/`, 'POST', payload, token);
      }
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      alert('Failed to save phase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Phase</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              {macrocycle ? 'Edit Phase' : 'Add Phase'}
              {readOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> View Only</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Top Row: Name & Dates */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Phase Name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. General Prep" required disabled={readOnly} /></div>
             <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Start</Label><DatePicker date={startDate} setDate={setStartDate} disabled={readOnly} /></div>
                <div className="space-y-2"><Label>End</Label><DatePicker date={endDate} setDate={setEndDate} disabled={readOnly} /></div>
             </div>
          </div>

          <div className="space-y-2">
              <Label>Primary Objective</Label>
              <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Main goal for this period..." disabled={readOnly} />
          </div>

          {/* THE 4 PILLARS GRID */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              
              {/* Technical */}
              <div className="space-y-2 p-3 bg-blue-50 rounded border border-blue-100">
                  <Label className="text-xs font-bold text-blue-700 flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Technical / Tactical
                  </Label>
                  <Textarea className="min-h-[80px] text-xs bg-white" value={techFocus} onChange={(e) => setTechFocus(e.target.value)} placeholder="Skills to acquire/refine..." disabled={readOnly} />
              </div>

              {/* Component */}
              <div className="space-y-2 p-3 bg-pink-50 rounded border border-pink-100">
                  <Label className="text-xs font-bold text-pink-700 flex items-center gap-2">
                      <Palette className="h-3 w-3" /> Artistic / Components
                  </Label>
                  <Textarea className="min-h-[80px] text-xs bg-white" value={compFocus} onChange={(e) => setCompFocus(e.target.value)} placeholder="Choreo, performance..." disabled={readOnly} />
              </div>

              {/* Physical */}
              <div className="space-y-2 p-3 bg-orange-50 rounded border border-orange-100">
                  <Label className="text-xs font-bold text-orange-700 flex items-center gap-2">
                      <Dumbbell className="h-3 w-3" /> Physical Capacity
                  </Label>
                  <Textarea className="min-h-[80px] text-xs bg-white" value={physFocus} onChange={(e) => setPhysFocus(e.target.value)} placeholder="Strength, cardio..." disabled={readOnly} />
              </div>

              {/* Mental */}
              <div className="space-y-2 p-3 bg-purple-50 rounded border border-purple-100">
                  <Label className="text-xs font-bold text-purple-700 flex items-center gap-2">
                      <Brain className="h-3 w-3" /> Mental & Self
                  </Label>
                  <Textarea className="min-h-[80px] text-xs bg-white" value={mentFocus} onChange={(e) => setMentFocus(e.target.value)} placeholder="Psych, lifestyle..." disabled={readOnly} />
              </div>

          </div>

          {!readOnly && (
              <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Phase'}</Button>
              </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}