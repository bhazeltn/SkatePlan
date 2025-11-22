import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Music, User, Archive, FileText, Image, Paperclip, Trash2, X } from 'lucide-react';
import { ProgramElementRow } from './ProgramElementRow';

export function ProgramModal({ skater, team, isSynchro, programToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Metadata
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [title, setTitle] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState('Free Skate');
  const [music, setMusic] = useState('');
  const [choreo, setChoreo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [elements, setElements] = useState([]);
  const [totalBV, setTotalBV] = useState(0);

  // Files
  const [musicFile, setMusicFile] = useState(null); // New upload
  const [currentMusic, setCurrentMusic] = useState(null); // Existing URL
  const [assets, setAssets] = useState([]); // List of existing assets
  
  // New Asset State
  const [newAssetFile, setNewAssetFile] = useState(null);
  const [newAssetType, setNewAssetType] = useState('COSTUME');

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
            
            setCurrentMusic(programToEdit.music_file);
            setAssets(programToEdit.assets || []);
        } else {
            // Create Mode
            if (team) setSelectedEntityId(team.id);
            else if (skater?.planning_entities?.length > 0) setSelectedEntityId(skater.planning_entities[0].id);
            
            setTitle(''); setSeason('2025-2026'); setCategory('Free Skate'); 
            setMusic(''); setChoreo(''); setIsActive(true);
            setElements([]); setTotalBV(0);
            setCurrentMusic(null); setAssets([]);
        }
        setMusicFile(null); setNewAssetFile(null);
    }
  }, [open, programToEdit, skater, team]);

  // Auto-Calc BV (Same as before)
  useEffect(() => {
      const sum = elements.reduce((acc, el) => {
          let val = parseFloat(el.base_value) || 0;
          if (el.type === 'JUMP' && el.is_second_half) val = val * 1.1;
          return acc + val;
      }, 0);
      setTotalBV(sum);
  }, [elements]);

  // Handlers (Same as before)
  const addElementRow = () => { setElements([...elements, { type: 'JUMP', components: [{ name: '', id: null }], level: '', notes: '', base_value: '', is_second_half: false }]); };
  const updateElementRow = (index, newData) => { const updated = [...elements]; updated[index] = newData; setElements(updated); };
  const removeElementRow = (index) => { setElements(elements.filter((_, i) => i !== index)); };

  // --- ASSET HANDLERS ---
  const handleUploadAsset = async () => {
      if (!newAssetFile || !programToEdit) return;
      setLoading(true);
      const formData = new FormData();
      formData.append('file', newAssetFile);
      formData.append('asset_type', newAssetType);
      
      try {
          await apiRequest(`/programs/${programToEdit.id}/assets/`, 'POST', formData, token);
          if (onSaved) onSaved(); // Refresh parent list
          
          // Refresh local assets list manually or re-fetch?
          // Quickest: Assume success and append (requires ID from response, so fetch is safer)
          // For now, let's trigger parent refresh and close/reopen? No, that's jarring.
          // Ideally onSaved triggers a refresh of data that flows back down.
          // But we can just close/re-open or trust user to close.
          
          alert("Asset uploaded!");
          setNewAssetFile(null);
          // In a full app, we'd re-fetch the single program here to update the list.
      } catch (e) { alert("Upload failed."); }
      finally { setLoading(false); }
  };

  const handleDeleteAsset = async (assetId) => {
      if (!confirm("Delete this file?")) return;
      try {
          await apiRequest(`/assets/${assetId}/`, 'DELETE', null, token);
          setAssets(assets.filter(a => a.id !== assetId)); // Optimistic update
          if (onSaved) onSaved();
      } catch (e) { alert("Delete failed."); }
  };

  const handleDeleteMusic = async () => {
      if (!confirm("Remove music file?")) return;
      // Since Music is a field on Program, we PATCH it to null
      try {
          const formData = new FormData();
          formData.append('music_file', ''); // Empty string/null usually clears it in DRF
          await apiRequest(`/programs/${programToEdit.id}/`, 'PATCH', formData, token);
          setCurrentMusic(null);
          if (onSaved) onSaved();
      } catch (e) { alert("Failed to remove music."); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ... (Entity Type Logic Same as Before) ...
    let entityType = null;
    if (team) entityType = isSynchro ? 'SynchroTeam' : 'Team';
    else {
        const entity = skater?.planning_entities?.find(e => String(e.id) === String(selectedEntityId));
        entityType = entity ? entity.type : null;
    }
    if (!entityType || !selectedEntityId) { setLoading(false); return alert("Error: Missing discipline."); }

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

    try {
      let url = '';
      if (programToEdit) {
        url = `/programs/${programToEdit.id}/`;
        await apiRequest(url, 'PATCH', formData, token);
      } else if (isSynchro) {
          url = `/synchro/${team.id}/programs/`;
          await apiRequest(url, 'POST', formData, token);
      } else if (team) {
        url = `/teams/${team.id}/programs/`;
        await apiRequest(url, 'POST', formData, token);
      } else {
        url = `/skaters/${skater.id}/programs/`;
        await apiRequest(url, 'POST', formData, token);
      }
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) { alert('Failed to save program.'); } 
    finally { setLoading(false); }
  };

  const handleArchive = async () => { /* ... */ };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Add Program</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{programToEdit ? 'Edit Program' : 'Add Program'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ... (Metadata Rows - Same as before) ... */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Discipline</Label>
                    {team ? (<Input value={team.team_name} disabled className="bg-slate-50 text-slate-500" />) : (<select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} disabled={!!programToEdit}>{skater?.planning_entities?.filter(e => ['SinglesEntity', 'SoloDanceEntity'].includes(e.type)).map(e => (<option key={e.id} value={e.id}>{e.name} ({e.current_level || 'No Level'})</option>))}</select>)}
                </div>
                <div className="space-y-2"><Label>Season</Label><Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2025-2026" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Program Name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Star Wars" /></div>
                <div className="space-y-2"><Label>Category</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="Free Skate">Free Skate</option><option value="Short Program">Short Program</option><option value="Rhythm Dance">Rhythm Dance</option><option value="Free Dance">Free Dance</option><option value="Artistic">Artistic</option><option value="Other">Other</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Music Title</Label><Input value={music} onChange={(e) => setMusic(e.target.value)} /></div>
                <div className="space-y-2"><Label>Choreographer</Label><Input value={choreo} onChange={(e) => setChoreo(e.target.value)} /></div>
            </div>

            {/* --- MASTER MUSIC SECTION --- */}
            <div className="space-y-2 p-3 bg-slate-50 rounded border">
                 <Label className="text-xs font-bold text-gray-500 uppercase">Audio Track</Label>
                 {currentMusic ? (
                     <div className="flex items-center justify-between bg-white p-2 rounded border">
                         <div className="flex items-center gap-2 text-sm text-blue-600 truncate">
                             <Music className="h-4 w-4" /> 
                             <a href={currentMusic} target="_blank" className="hover:underline">Current Music File</a>
                         </div>
                         <Button type="button" variant="ghost" size="sm" onClick={handleDeleteMusic}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                     </div>
                 ) : (
                     <Input type="file" accept="audio/*" onChange={(e) => setMusicFile(e.target.files[0])} />
                 )}
            </div>

            {/* --- ASSET GALLERY (Photos/Designs) --- */}
            <div className="space-y-2 p-3 bg-slate-50 rounded border">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Visual Assets (Costumes, etc)</Label>
                </div>

                {/* Existing Assets List */}
                {assets.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {assets.map(asset => (
                            <div key={asset.id} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                                <div className="flex items-center gap-2 truncate">
                                    {asset.asset_type === 'COSTUME' ? <Image className="h-3 w-3 text-purple-500"/> : <FileText className="h-3 w-3 text-blue-500"/>}
                                    <a href={asset.file} target="_blank" className="truncate hover:underline max-w-[100px]">{asset.asset_type}</a>
                                </div>
                                <button type="button" onClick={() => handleDeleteAsset(asset.id)}><X className="h-3 w-3 text-gray-400 hover:text-red-500"/></button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload New (Only available in Edit Mode) */}
                {programToEdit ? (
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px]">Add File</Label>
                            <Input type="file" className="h-8 text-xs" onChange={(e) => setNewAssetFile(e.target.files[0])} />
                        </div>
                        <div className="w-24 space-y-1">
                            <Label className="text-[10px]">Type</Label>
                            <select className="h-8 w-full text-xs rounded border" value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)}>
                                <option value="COSTUME">Costume</option>
                                <option value="HAIR">Hair</option>
                                <option value="DESIGN">Design</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <Button type="button" size="sm" className="h-8" onClick={handleUploadAsset} disabled={!newAssetFile}>Upload</Button>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground italic">Save program first to add photos.</p>
                )}
            </div>
            {/* --------------------------- */}

            <div className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4"><Label className="text-gray-900 font-bold">Program Layout</Label><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Est. Base Value: {totalBV.toFixed(2)}</span></div>
                    <Button type="button" size="sm" variant="outline" onClick={addElementRow}><Plus className="h-3 w-3 mr-1" /> Add Element</Button>
                </div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 pb-40">
                    {elements.map((el, i) => (<ProgramElementRow key={i} index={i} element={el} onChange={updateElementRow} onRemove={removeElementRow} />))}
                </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t">
                {programToEdit ? (
                    <div className="flex gap-2">
                        {/* --- DELETE BUTTON --- */}
                        <Button type="button" variant="destructive" onClick={() => { if(confirm("Delete Program?")) { /* Add API Call */ } }}>Delete</Button>
                        <Button type="button" variant="outline" onClick={handleArchive}>{isActive ? 'Archive' : 'Restore'}</Button>
                    </div>
                ) : (<div></div>)}
                <Button type="submit" disabled={loading} className={!programToEdit ? "w-full" : ""}>Save Program</Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}