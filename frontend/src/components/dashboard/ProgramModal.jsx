import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Music, User, Archive, FileText, Image } from 'lucide-react';
import { ProgramElementRow } from './ProgramElementRow';

export function ProgramModal({ skater, team, isSynchro, programToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Metadata State
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [title, setTitle] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState('Free Skate');
  const [music, setMusic] = useState('');
  const [choreo, setChoreo] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Content State
  const [elements, setElements] = useState([]);
  const [totalBV, setTotalBV] = useState(0);

  // File State
  const [musicFile, setMusicFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [costumePhoto, setCostumePhoto] = useState(null);
  const [hairPhoto, setHairPhoto] = useState(null);

  // --- FILTERED ENTITIES (For Skater View) ---
  // Only show individual disciplines (Singles, Solo Dance). 
  // Hide Teams/Synchro because those must be managed on their respective dashboards.
  const individualEntities = skater?.planning_entities?.filter(e => 
      ['SinglesEntity', 'SoloDanceEntity'].includes(e.type)
  ) || [];

  useEffect(() => {
    if (open) {
        if (programToEdit) {
            // Edit Mode
            setSelectedEntityId(programToEdit.object_id);
            setTitle(programToEdit.title);
            setSeason(programToEdit.season);
            setCategory(programToEdit.program_category);
            setMusic(programToEdit.music_title || '');
            setChoreo(programToEdit.choreographer || '');
            setIsActive(programToEdit.is_active);
            setElements(programToEdit.planned_elements || []);
            
            // Reset files
            setMusicFile(null); setDesignFile(null); setCostumePhoto(null); setHairPhoto(null);
        } else {
            // Create Mode
            if (team) {
                // TEAM CONTEXT: Hardcode to this team
                setSelectedEntityId(team.id);
            } else if (individualEntities.length > 0) {
                // SKATER CONTEXT: Default to first individual entity
                setSelectedEntityId(individualEntities[0].id);
            }
            
            setTitle('');
            setSeason('2025-2026'); 
            setCategory('Free Skate');
            setMusic('');
            setChoreo('');
            setIsActive(true);
            setElements([]);
            setMusicFile(null); setDesignFile(null); setCostumePhoto(null); setHairPhoto(null);
        }
    }
  }, [open, programToEdit, skater, team]);

  // Auto-Calc BV
  useEffect(() => {
      const sum = elements.reduce((acc, el) => {
          let val = parseFloat(el.base_value) || 0;
          if (el.type === 'JUMP' && el.is_second_half) val = val * 1.1;
          return acc + val;
      }, 0);
      setTotalBV(sum);
  }, [elements]);

  // Element Handlers
  const addElementRow = () => { setElements([...elements, { type: 'JUMP', components: [{ name: '', id: null }], level: '', notes: '', base_value: '', is_second_half: false }]); };
  const updateElementRow = (index, newData) => { const updated = [...elements]; updated[index] = newData; setElements(updated); };
  const removeElementRow = (index) => { setElements(elements.filter((_, i) => i !== index)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // --- DETERMINE ENTITY TYPE ---
    let entityType = null;
    
    if (team) {
        // If on Team Dashboard, it's always a Team entity
        entityType = isSynchro ? 'SynchroTeam' : 'Team';
    } else {
        // If on Skater Dashboard, lookup the selected individual entity
        const entity = individualEntities.find(e => String(e.id) === String(selectedEntityId));
        entityType = entity ? entity.type : null;
    }

    if (!entityType || !selectedEntityId) {
        alert("Error: Could not determine discipline linkage.");
        setLoading(false);
        return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('title', title);
    formData.append('season', season);
    formData.append('program_category', category);
    formData.append('music_title', music);
    formData.append('choreographer', choreo);
    formData.append('planning_entity_id', selectedEntityId);
    formData.append('planning_entity_type', entityType);
    formData.append('is_active', isActive);
    formData.append('est_base_value', totalBV);
    formData.append('planned_elements', JSON.stringify(elements));

    if (musicFile) formData.append('music_file', musicFile);
    if (designFile) formData.append('costume_design', designFile);
    if (costumePhoto) formData.append('costume_photo', costumePhoto);
    if (hairPhoto) formData.append('hair_photo', hairPhoto);

    try {
      if (programToEdit) {
        await apiRequest(`/programs/${programToEdit.id}/`, 'PATCH', formData, token);
      } else if (isSynchro) {
         // Use Synchro-specific endpoint if needed, or standard team logic
         await apiRequest(`/synchro/${team.id}/programs/`, 'POST', formData, token); // Assuming we add this endpoint next if needed, or reuse team
      } else if (team) {
        await apiRequest(`/teams/${team.id}/programs/`, 'POST', formData, token);
      } else {
        await apiRequest(`/skaters/${skater.id}/programs/`, 'POST', formData, token);
      }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      alert('Failed to save program.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
      if (!confirm(`Are you sure?`)) return;
      setLoading(true);
      try {
          await apiRequest(`/programs/${programToEdit.id}/`, 'PATCH', { is_active: !isActive }, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed."); }
      finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Add Program</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{programToEdit ? 'Edit Program' : 'Add Program'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Discipline</Label>
                    {team ? (
                        // TEAM/SYNCHRO MODE: Read-only Input
                        <Input 
                            value={team.team_name} 
                            disabled 
                            className="bg-slate-50 text-slate-500" 
                        />
                    ) : (
                        // SKATER MODE: Filtered Dropdown (No Teams)
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                            value={selectedEntityId}
                            onChange={(e) => setSelectedEntityId(e.target.value)}
                            disabled={!!programToEdit}
                        >
                            {individualEntities.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.current_level || 'No Level'})</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="space-y-2"><Label>Season</Label><Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2025-2026" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Program Name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Star Wars" /></div>
                <div className="space-y-2"><Label>Category</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="Free Skate">Free Skate</option><option value="Short Program">Short Program</option><option value="Rhythm Dance">Rhythm Dance</option><option value="Free Dance">Free Dance</option><option value="Artistic">Artistic</option><option value="Other">Other</option></select></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Music Title</Label><div className="relative"><Music className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={music} onChange={(e) => setMusic(e.target.value)} placeholder="e.g. Duel of the Fates" /></div></div>
                <div className="space-y-2"><Label>Choreographer</Label><div className="relative"><User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={choreo} onChange={(e) => setChoreo(e.target.value)} placeholder="e.g. Lori Nichol" /></div></div>
            </div>

            {/* Files Section */}
            <div className="space-y-3 p-3 bg-slate-50 rounded border">
                <Label className="text-xs font-bold text-gray-500 uppercase">Files & Assets</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><Music className="h-3 w-3"/> Music (MP3)</Label><Input type="file" accept="audio/*" className="h-8 text-xs" onChange={(e) => setMusicFile(e.target.files[0])} /></div>
                    <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3"/> Design (PDF)</Label><Input type="file" accept="image/*,application/pdf" className="h-8 text-xs" onChange={(e) => setDesignFile(e.target.files[0])} /></div>
                    <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><Image className="h-3 w-3"/> Costume</Label><Input type="file" accept="image/*" className="h-8 text-xs" onChange={(e) => setCostumePhoto(e.target.files[0])} /></div>
                    <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><Image className="h-3 w-3"/> Hair</Label><Input type="file" accept="image/*" className="h-8 text-xs" onChange={(e) => setHairPhoto(e.target.files[0])} /></div>
                </div>
            </div>

            <div className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                        <Label className="text-gray-900 font-bold">Program Layout</Label>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Est. Base Value: {totalBV.toFixed(2)}</span>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addElementRow}><Plus className="h-3 w-3 mr-1" /> Add Element</Button>
                </div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 pb-40">
                    {elements.map((el, i) => (
                        <ProgramElementRow key={i} index={i} element={el} onChange={updateElementRow} onRemove={removeElementRow} />
                    ))}
                </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t">
                {programToEdit && <Button type="button" variant="outline" onClick={handleArchive} disabled={loading} className="text-gray-500 hover:text-gray-700"><Archive className="h-4 w-4 mr-2" />{isActive ? 'Archive' : 'Restore'}</Button>}
                <Button type="submit" disabled={loading} className={!programToEdit ? "w-full" : ""}>Save Program</Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}