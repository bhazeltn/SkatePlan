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
import { Activity, Plus, Star, Zap, Smile } from 'lucide-react';

const MOODS = ["🔥", "🙂", "😐", "😓", "😡", "🤕"];

export function LogSessionModal({ skater, team, isSynchro, onLogCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  
  // Ratings
  const [rating, setRating] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState('🙂');

  const [notes, setNotes] = useState('');
  const [mentalFocus, setMentalFocus] = useState('');

  useEffect(() => {
      if (open) {
          if (team) {
              // TEAM MODE: ID is the team id
              setSelectedEntityId(team.id);
          } else if (skater?.planning_entities?.length > 0) {
              // SKATER MODE: Default to first entity
              setSelectedEntityId(skater.planning_entities[0].id);
          }
      }
  }, [open, skater, team]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntityId) return alert("Please select a discipline.");
    
    setLoading(true);

    try {
      // Determine Entity Type
      let entityType = null;
      if (team) {
          entityType = isSynchro ? 'SynchroTeam' : 'Team';
      } else {
           const entity = skater.planning_entities.find(e => String(e.id) === String(selectedEntityId));
           entityType = entity ? entity.type : null;
      }

      const payload = {
        session_date: date,
        planning_entity_id: selectedEntityId,
        planning_entity_type: entityType,
        session_rating: rating,
        energy_stamina: energy,
        sentiment_emoji: mood,
        wellbeing_mental_focus_notes: mentalFocus,
        coach_notes: notes,
      };

      // --- DYNAMIC ENDPOINT ---
      if (isSynchro) {
           await apiRequest(`/synchro/${team.id}/logs/`, 'POST', payload, token);
      } else if (team) {
           await apiRequest(`/teams/${team.id}/logs/`, 'POST', payload, token);
      } else {
           await apiRequest(`/skaters/${skater.id}/logs/`, 'POST', payload, token);
      }
      
      if (onLogCreated) onLogCreated();
      setOpen(false);
      
      // Reset
      setNotes(''); setMentalFocus(''); setRating(3); setEnergy(3); setMood('🙂');
    } catch (err) {
      alert('Failed to log session. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Star Renderer
  const renderRating = (currentVal, setVal, iconType = 'star') => {
      return (
          <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                  <button key={val} type="button" onClick={() => setVal(val)} className="focus:outline-none transition-transform hover:scale-110">
                      {iconType === 'star' ? (
                          <Star className={`h-6 w-6 ${val <= currentVal ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ) : (
                          <Zap className={`h-6 w-6 ${val <= currentVal ? 'fill-blue-400 text-blue-400' : 'text-gray-300'}`} />
                      )}
                  </button>
              ))}
          </div>
      );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> Log Session</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Training Session</DialogTitle>
          <DialogDescription>Record today's training details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Date</Label><DatePicker date={date} setDate={setDate} /></div>
             <div className="space-y-2">
                <Label>Discipline</Label>
                {/* --- CONDITIONAL INPUT --- */}
                {team ? (
                    <Input value={team.team_name} disabled className="bg-slate-50 text-slate-500" />
                ) : (
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}>
                        {skater?.planning_entities?.map((entity) => (
                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))}
                    </select>
                )}
                {/* ------------------------ */}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-md border flex flex-col justify-center items-center space-y-2">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Quality</Label>
                {renderRating(rating, setRating, 'star')}
            </div>
            <div className="p-3 bg-slate-50 rounded-md border flex flex-col justify-center items-center space-y-2">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Energy</Label>
                {renderRating(energy, setEnergy, 'zap')}
            </div>
          </div>

          <div className="space-y-2">
             <Label className="flex items-center gap-2"><Smile className="h-4 w-4" /> Mental State & Focus</Label>
             <div className="flex justify-between bg-slate-50 p-2 rounded-md border mb-2">
                {MOODS.map(m => (
                    <button key={m} type="button" onClick={() => setMood(m)} className={`text-2xl hover:scale-125 transition-transform px-2 ${mood === m ? 'scale-125 bg-white shadow-sm rounded-full' : 'opacity-60'}`}>{m}</button>
                ))}
             </div>
             <Input value={mentalFocus} onChange={(e) => setMentalFocus(e.target.value)} placeholder="Specific focus notes..." />
          </div>

          <div className="space-y-2"><Label>Coach Notes</Label><Textarea className="min-h-[80px]" placeholder="Technical feedback..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          <DialogFooter><Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Log'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}