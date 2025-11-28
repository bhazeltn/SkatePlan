import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Star, Zap, Smile, Users, Check, X, Clock } from 'lucide-react';

const MOODS = ["🔥", "🙂", "😐", "😓", "😡", "🤕"];

export function LogSessionModal({ skater, team, isSynchro, logToEdit, onLogCreated, trigger, permissions }) {
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
  const [mentalFocus, setMentalFocus] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);

  // Split Notes State
  const [coachNotes, setCoachNotes] = useState('');
  const [skaterNotes, setSkaterNotes] = useState('');

  // Permission Checks
  const isCoach = permissions?.role === 'COACH' || permissions?.role === 'COLLABORATOR';
  const isFamily = permissions?.role === 'GUARDIAN' || permissions?.role === 'SKATER';
  const canDelete = isCoach; // Only Coach can delete logs

  useEffect(() => {
      if (open) {
          if (logToEdit) {
              // --- EDIT MODE ---
              setDate(logToEdit.session_date);
              setRating(logToEdit.session_rating || 3);
              setEnergy(logToEdit.energy_stamina || 3);
              setMood(logToEdit.sentiment_emoji || '🙂');
              setMentalFocus(logToEdit.wellbeing_mental_focus_notes || '');
              
              // Load split notes
              setCoachNotes(logToEdit.coach_notes || '');
              setSkaterNotes(logToEdit.skater_notes || '');
              
              setAttendanceList(logToEdit.attendance || []);
          } else {
              // --- CREATE MODE ---
              setDate(new Date().toISOString().split('T')[0]);
              setRating(3); setEnergy(3); setMood('🙂'); 
              setCoachNotes(''); setSkaterNotes(''); setMentalFocus('');
              
              // Setup Default Entity
              if (team) {
                  setSelectedEntityId(team.id);
                  // Init Roster
                  let roster = [];
                  if (isSynchro && team.roster) {
                      roster = team.roster.map(s => ({ id: s.id, name: s.full_name, status: 'PRESENT' }));
                  } else if (team.partner_a_details) {
                      roster = [
                          { id: team.partner_a_details.id, name: team.partner_a_details.full_name, status: 'PRESENT' },
                          { id: team.partner_b_details.id, name: team.partner_b_details.full_name, status: 'PRESENT' }
                      ];
                  }
                  setAttendanceList(roster);
              } else if (skater?.planning_entities?.length > 0) {
                  setSelectedEntityId(skater.planning_entities[0].id);
                  setAttendanceList([]); 
              }
          }
      }
  }, [open, skater, team, isSynchro, logToEdit]);

  const toggleAttendance = (index) => {
      const newList = [...attendanceList];
      const current = newList[index].status;
      if (current === 'PRESENT') newList[index].status = 'ABSENT';
      else if (current === 'ABSENT') newList[index].status = 'LATE';
      else newList[index].status = 'PRESENT';
      setAttendanceList(newList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let entityType = null;
      if (team) entityType = isSynchro ? 'SynchroTeam' : 'Team';
      else {
           const entity = skater?.planning_entities?.find(e => String(e.id) === String(selectedEntityId));
           entityType = entity ? entity.type : 'SinglesEntity';
      }

      const payload = {
        session_date: date,
        planning_entity_id: selectedEntityId,
        planning_entity_type: entityType,
        session_rating: rating,
        energy_stamina: energy,
        sentiment_emoji: mood,
        wellbeing_mental_focus_notes: mentalFocus,
        coach_notes: coachNotes,   // Send both notes
        skater_notes: skaterNotes, // Backend permissions will ignore the one they can't edit
        attendance: attendanceList
      };

      if (logToEdit) {
          await apiRequest(`/logs/${logToEdit.id}/`, 'PATCH', payload, token);
      } else if (isSynchro) {
           await apiRequest(`/synchro/${team.id}/logs/`, 'POST', payload, token);
      } else if (team) {
           await apiRequest(`/teams/${team.id}/logs/`, 'POST', payload, token);
      } else {
           await apiRequest(`/skaters/${skater.id}/logs/`, 'POST', payload, token);
      }
      
      if (onLogCreated) onLogCreated();
      setOpen(false);
    } catch (err) {
      alert('Failed to save log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
      if (!confirm("Delete this log?")) return;
      setLoading(true);
      try {
          await apiRequest(`/logs/${logToEdit.id}/`, 'DELETE', null, token);
          if (onLogCreated) onLogCreated();
          setOpen(false);
      } catch (e) { alert("Failed to delete."); }
      finally { setLoading(false); }
  };

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

  const StatusIcon = ({ status }) => {
      if (status === 'PRESENT') return <Check className="h-4 w-4 text-green-600" />;
      if (status === 'ABSENT') return <X className="h-4 w-4 text-red-600" />;
      if (status === 'LATE') return <Clock className="h-4 w-4 text-amber-600" />;
      return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> Log Session</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{logToEdit ? 'Edit Log' : 'Log Training Session'}</DialogTitle>
          <DialogDescription>Record details and wellbeing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Date</Label><DatePicker date={date} setDate={setDate} /></div>
             <div className="space-y-2">
                <Label>Discipline</Label>
                {team ? (
                    <Input value={team.team_name} disabled className="bg-slate-50 text-slate-500" />
                ) : (
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} disabled={!!logToEdit}>
                        {skater?.planning_entities?.map((entity) => (<option key={entity.id} value={entity.id}>{entity.name}</option>))}
                    </select>
                )}
             </div>
          </div>

          {/* --- ATTENDANCE --- */}
          {attendanceList.length > 0 && (
              <div className="space-y-2 border rounded-md p-3 bg-slate-50">
                  <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Users className="h-3 w-3" /> Attendance
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                      {attendanceList.map((person, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleAttendance(idx)}>
                              <span className="text-sm font-medium">{person.name}</span>
                              <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-bold w-24 justify-center ${person.status === 'PRESENT' ? 'bg-green-100 text-green-800' : ''} ${person.status === 'ABSENT' ? 'bg-red-100 text-red-800' : ''} ${person.status === 'LATE' ? 'bg-amber-100 text-amber-800' : ''}`}>
                                  <StatusIcon status={person.status} /> {person.status}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

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
             <Label className="flex items-center gap-2"><Smile className="h-4 w-4" /> Mental State</Label>
             <div className="flex justify-between bg-slate-50 p-2 rounded-md border mb-2">
                {MOODS.map(m => (<button key={m} type="button" onClick={() => setMood(m)} className={`text-2xl hover:scale-125 transition-transform px-2 ${mood === m ? 'scale-125 bg-white shadow-sm rounded-full' : 'opacity-60'}`}>{m}</button>))}
             </div>
             <Input value={mentalFocus} onChange={(e) => setMentalFocus(e.target.value)} placeholder="Focus notes..." />
          </div>

          {/* NOTES SECTION - SPLIT VIEW */}
          <div className="space-y-3 border-t pt-4">
             {/* Coach Notes */}
             <div className="space-y-1.5">
                 <Label className="text-xs font-bold text-blue-700 uppercase">
                    {isCoach ? "Coach Notes (Your Feedback)" : "Coach Feedback (Read Only)"}
                 </Label>
                 <Textarea 
                    value={coachNotes} 
                    onChange={(e) => setCoachNotes(e.target.value)} 
                    disabled={!isCoach} // Only coach can edit
                    className={!isCoach ? "bg-slate-50 text-slate-600" : ""}
                    placeholder={isCoach ? "Technical feedback..." : "Waiting for coach feedback..."}
                 />
             </div>

             {/* Skater/Parent Notes */}
             <div className="space-y-1.5">
                 <Label className="text-xs font-bold text-green-700 uppercase">
                    {isFamily ? "My Notes / Reflections" : "Skater Reflections (Read Only)"}
                 </Label>
                 <Textarea 
                    value={skaterNotes} 
                    onChange={(e) => setSkaterNotes(e.target.value)} 
                    disabled={!isFamily} // Only family can edit
                    className={!isFamily ? "bg-slate-50 text-slate-600" : ""}
                    placeholder={isFamily ? "How did it feel?" : "No reflections yet."}
                 />
             </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
              {logToEdit && canDelete ? ( // Only show Delete if allowed (Coach)
                  <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
              ) : <div></div>}
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Log'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}