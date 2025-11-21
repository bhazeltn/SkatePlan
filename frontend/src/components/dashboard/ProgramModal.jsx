import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Music, User, Archive } from 'lucide-react';
import { ProgramElementRow } from './ProgramElementRow'; // Ensure this is created

export function ProgramModal({ skater, programToEdit, onSaved, trigger }) {
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

  // Content State (List of Elements)
  // Structure: [{ type: 'JUMP', components: [{name: '', id: null}], level: '', notes: '' }]
  const [elements, setElements] = useState([]);

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
            
            // Load Elements (Ensure it's an array)
            setElements(programToEdit.planned_elements || []);
        } else {
            // Create Mode
            if (skater?.planning_entities?.length > 0) {
                setSelectedEntityId(skater.planning_entities[0].id);
            }
            setTitle('');
            setSeason('2025-2026'); 
            setCategory('Free Skate');
            setMusic('');
            setChoreo('');
            setIsActive(true);
            setElements([]);
        }
    }
  }, [open, programToEdit, skater]);

  // --- ELEMENT HANDLERS ---
  const addElementRow = () => {
      setElements([...elements, { 
          type: 'JUMP', 
          components: [{ name: '', id: null }], 
          level: '', 
          notes: '' 
      }]);
  };

  const updateElementRow = (index, newData) => {
      const updated = [...elements];
      updated[index] = newData;
      setElements(updated);
  };

  const removeElementRow = (index) => {
      setElements(elements.filter((_, i) => i !== index));
  };

  // --- MAIN HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Find entity type (SinglesEntity, etc.)
    const entity = skater.planning_entities.find(e => String(e.id) === String(selectedEntityId));
    const entityType = entity ? entity.type : null;

    try {
      const payload = {
        title,
        season,
        program_category: category,
        music_title: music,
        choreographer: choreo,
        planning_entity_id: selectedEntityId,
        planning_entity_type: entityType,
        is_active: isActive,
        planned_elements: elements // Send the JSON content
      };

      if (programToEdit) {
        await apiRequest(`/programs/${programToEdit.id}/`, 'PATCH', payload, token);
      } else {
        await apiRequest(`/skaters/${skater.id}/programs/`, 'POST', payload, token);
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
      if (!confirm(`Are you sure you want to ${isActive ? 'archive' : 'activate'} this program?`)) return;
      setLoading(true);
      try {
          await apiRequest(`/programs/${programToEdit.id}/`, 'PATCH', { is_active: !isActive }, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to update status."); }
      finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Add Program</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{programToEdit ? 'Edit Program' : 'Add Program'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Discipline & Season */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Discipline</Label>
                    <select 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        disabled={!!programToEdit}
                    >
                        {skater?.planning_entities?.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Season</Label>
                    <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2025-2026" />
                </div>
            </div>

            {/* Row 2: Title & Category */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Program Name</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Star Wars" />
                </div>
                <div className="space-y-2">
                    <Label>Category</Label>
                    <select 
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="Short Program">Short Program</option>
                        <option value="Free Skate">Free Skate</option>
                        <option value="Rhythm Dance">Rhythm Dance</option>
                        <option value="Free Dance">Free Dance</option>
                        <option value="Artistic">Artistic</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            {/* Row 3: Metadata */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Music Title</Label>
                    <div className="relative">
                        <Music className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" value={music} onChange={(e) => setMusic(e.target.value)} placeholder="e.g. Duel of the Fates" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Choreographer</Label>
                    <div className="relative">
                        <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" value={choreo} onChange={(e) => setChoreo(e.target.value)} placeholder="e.g. Lori Nichol" />
                    </div>
                </div>
            </div>

            {/* --- PROGRAM CONTENT EDITOR --- */}
            <div className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                    <Label className="text-gray-900 font-bold">Program Layout</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addElementRow}>
                        <Plus className="h-3 w-3 mr-1" /> Add Element
                    </Button>
                </div>
                
                {/* ADD pb-40 HERE to make room for the dropdowns */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pb-40">
                    {elements.length === 0 && (
                        <div className="text-center p-4 border-2 border-dashed rounded text-xs text-muted-foreground">
                            No elements added. Click "Add Element" to build your layout.
                        </div>
                    )}
                    {elements.map((el, i) => (
                        <ProgramElementRow 
                            key={i} 
                            index={i} 
                            element={el} 
                            onChange={updateElementRow} 
                            onRemove={removeElementRow} 
                        />
                    ))}
                </div>
            </div>
            {/* ------------------------------ */}

            {/* Footer Actions */}
            <div className="pt-4 flex justify-between items-center border-t">
                {programToEdit && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleArchive}
                        disabled={loading}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <Archive className="h-4 w-4 mr-2" />
                        {isActive ? 'Archive' : 'Restore'}
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={!programToEdit ? "w-full" : ""}>Save Program</Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}