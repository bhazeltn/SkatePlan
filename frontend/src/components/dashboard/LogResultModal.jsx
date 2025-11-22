import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, Plus, MapPin, Trash2, ChevronDown, ChevronUp, Video } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { ProtocolEditor } from './ProtocolEditor';

export function LogResultModal({ skater, team, isSynchro, resultToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  
  const [step, setStep] = useState(resultToEdit ? 'LOG' : 'SEARCH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search & Create State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedComp, setSelectedComp] = useState(resultToEdit?.competition || null);
  const [newTitle, setNewTitle] = useState('');
  const [countryCode, setCountryCode] = useState('CA');
  const [stateCode, setStateCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Result State
  const [selectedEntityId, setSelectedEntityId] = useState(
      resultToEdit?.object_id || team?.id || skater?.planning_entities?.[0]?.id || ''
  );
  
  const [status, setStatus] = useState(resultToEdit?.status || 'COMPLETED'); 
  const [level, setLevel] = useState(resultToEdit?.level || '');
  const [placement, setPlacement] = useState(resultToEdit?.placement || '');
  const [overallScore, setOverallScore] = useState(resultToEdit?.total_score || '');
  const [notes, setNotes] = useState(resultToEdit?.notes || '');
  const [segments, setSegments] = useState(resultToEdit?.segment_scores || []);

  // Toggles
  const [expandedPCS, setExpandedPCS] = useState(null);
  const [expandedProtocol, setExpandedProtocol] = useState(null);

  // Files
  const [detailSheet, setDetailSheet] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');

  // Init / Reset
  useEffect(() => {
      if (open) {
          if (resultToEdit) {
              setStep('LOG');
              setSelectedComp(resultToEdit.competition);
              if (resultToEdit.object_id) setSelectedEntityId(resultToEdit.object_id);
              
              setStatus(resultToEdit.status);
              setLevel(resultToEdit.level || '');
              setPlacement(resultToEdit.placement || '');
              setOverallScore(resultToEdit.total_score || '');
              setNotes(resultToEdit.notes || '');
              setSegments(resultToEdit.segment_scores || []);
              setVideoUrl(resultToEdit.video_url || '');
              setDetailSheet(null); // Files cannot be pre-filled
          } else {
              setStep('SEARCH');
              setSelectedComp(null);
              if (team) setSelectedEntityId(team.id);
              else if (skater?.planning_entities?.length > 0) setSelectedEntityId(skater.planning_entities[0].id);
              
              setStatus('COMPLETED'); // Default to Completed so fields show
              setLevel('');
              setPlacement('');
              setOverallScore('');
              setNotes('');
              setSegments([]);
              setVideoUrl('');
              setDetailSheet(null);
          }
      }
  }, [open, resultToEdit, skater, team]);

  // Auto-Calculate Total Score
  useEffect(() => {
      if (segments.length > 0 && status === 'COMPLETED') {
          const total = segments.reduce((sum, seg) => sum + (parseFloat(seg.score) || 0), 0);
          setOverallScore(total > 0 ? total.toFixed(2) : '');
      }
  }, [segments, status]);

  // --- HANDLERS ---

  const handleSearch = async () => {
      setLoading(true); setError(null);
      try {
          const data = await apiRequest(`/competitions/?search=${searchTerm}`, 'GET', null, token);
          setSearchResults(data || []);
      } catch(e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const handleCreate = async () => {
      setLoading(true); setError(null);
      try {
          const data = await apiRequest('/competitions/', 'POST', {
              title: newTitle,
              country: countryCode,
              province_state: stateCode,
              city: cityName,
              start_date: start,
              end_date: end
          }, token);
          setSelectedComp(data);
          setStep('LOG');
      } catch (e) { setError("Failed to create event (Duplicate?)."); } 
      finally { setLoading(false); }
  };

  // Segment Logic
  const addSegment = () => {
      setSegments([...segments, { 
          id: Date.now(), 
          name: 'Short Program', 
          score: '', 
          tes: '', 
          pcs: '', 
          pcs_composition: '', 
          pcs_presentation: '', 
          pcs_skills: '', 
          deductions: '', 
          bonus: '', 
          placement: '', 
          protocol: [] 
      }]);
  };
  
  const removeSegment = (id) => setSegments(segments.filter(s => s.id !== id));
  const updateSegment = (id, field, value) => setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  
  // Toggles
  const togglePCS = (id) => setExpandedPCS(expandedPCS === id ? null : id);
  const toggleProtocol = (id) => setExpandedProtocol(expandedProtocol === id ? null : id);
  
  const updateProtocol = (id, newProto) => {
      const updated = segments.map(s => {
          if (s.id === id) {
              // Optional: Auto-calc TES from protocol sum?
              // For now just save the protocol data
              return { ...s, protocol: newProto };
          }
          return s;
      });
      setSegments(updated);
  };

  // --- SAVE LOGIC (FormData) ---
  const saveResult = async () => {
      const formData = new FormData();
      formData.append('competition_id', selectedComp.id);
      formData.append('planning_entity_id', selectedEntityId);
      formData.append('status', status);
      formData.append('level', level);
      formData.append('notes', notes);
      formData.append('video_url', videoUrl);
      if (detailSheet) formData.append('detail_sheet', detailSheet);

      if (status === 'COMPLETED') {
          formData.append('placement', placement);
          formData.append('total_score', overallScore);
          // JSON.stringify ensures complex segment data survives FormData
          formData.append('segment_scores', JSON.stringify(segments));
      }

      // Dynamic Endpoint Selection
      if (resultToEdit) {
          await apiRequest(`/results/${resultToEdit.id}/`, 'PATCH', formData, token);
      } else if (isSynchro) {
          await apiRequest(`/synchro/${team.id}/results/`, 'POST', formData, token);
      } else if (team) {
          await apiRequest(`/teams/${team.id}/results/`, 'POST', formData, token);
      } else {
          await apiRequest(`/skaters/${skater.id}/results/`, 'POST', formData, token);
      }
      
      if (onSaved) onSaved();
  };

  const handleSave = async () => {
      setLoading(true);
      try {
          await saveResult();
          setOpen(false);
      } catch (e) { 
          console.error(e);
          alert("Failed to save: " + (e.message || "Unknown error")); 
      } finally { setLoading(false); }
  };

  const handleSaveAndAdd = async () => {
      setLoading(true);
      try {
          await saveResult();
          // Reset result fields but keep competition context
          setLevel(''); setPlacement(''); setOverallScore(''); setNotes(''); 
          setSegments([]); setDetailSheet(null); setVideoUrl('');
          alert("Result saved! Ready for next entry.");
      } catch (e) { 
          console.error(e);
          alert("Failed to save: " + (e.message || "Unknown error")); 
      } finally { setLoading(false); }
  };

  // --- RENDER HELPERS ---
  const renderLocationSelectors = () => {
      const countries = Country.getAllCountries();
      const states = State.getStatesOfCountry(countryCode);
      const cities = City.getCitiesOfState(countryCode, stateCode);
      return (
          <div className="space-y-3 p-3 bg-slate-50 rounded border">
             <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Country</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); setCityName(''); }}>{countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}</select></div>
                  <div><Label className="text-xs">Prov/State</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={stateCode} onChange={(e) => { setStateCode(e.target.value); setCityName(''); }} disabled={!countryCode}><option value="">Select...</option>{states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}</select></div>
              </div>
              <div><Label className="text-xs">City</Label>{cities.length > 0 ? (<select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={cityName} onChange={(e) => setCityName(e.target.value)} disabled={!stateCode}><option value="">Select City...</option>{cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select>) : (<Input value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="Enter City Name" />)}</div>
          </div>
      );
  };

  const renderLogStep = () => (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-slate-100 p-3 rounded text-sm font-medium border">{selectedComp?.title} <span className="text-gray-500 font-normal">({selectedComp?.city})</span></div>

          <div className="grid grid-cols-2 gap-4">
              {!team ? (
                  <div className="space-y-2"><Label>Discipline</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}>{skater?.planning_entities?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
              ) : (
                  <div className="space-y-2"><Label>Team</Label><Input value={team.team_name} disabled className="bg-slate-50" /></div>
              )}
              <div className="space-y-2"><Label>Status</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm font-medium" value={status} onChange={(e) => setStatus(e.target.value)}><option value="PLANNED">Planned</option><option value="REGISTERED">Registered</option><option value="COMPLETED">Completed</option></select></div>
          </div>

          <div className="space-y-2"><Label>Event Level / Category</Label><Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Junior Women" /></div>

          {status === 'COMPLETED' && (
              <>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Placement</Label><Input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="#" /></div>
                      <div className="space-y-2"><Label>Total Score</Label><Input type="number" step="0.01" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} disabled={segments.length > 0} className={segments.length > 0 ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""} /></div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                      <div className="flex justify-between items-center mb-3"><Label className="text-gray-900 font-bold">Segments</Label><Button type="button" size="sm" variant="outline" onClick={addSegment}><Plus className="h-3 w-3 mr-1" /> Add Segment</Button></div>
                      <div className="space-y-3">
                          {segments.map((seg) => (
                              <div key={seg.id} className="p-3 border rounded-md bg-slate-50 relative">
                                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => removeSegment(seg.id)}><Trash2 className="h-3 w-3" /></Button>
                                  <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                      <div className="col-span-2 sm:col-span-1"><Label className="text-xs">Segment</Label><select className="flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs" value={seg.name} onChange={(e) => updateSegment(seg.id, 'name', e.target.value)}><option value="Short Program">Short Program</option><option value="Free Skate">Free Skate</option><option value="Pattern Dance">Pattern Dance</option><option value="Rhythm Dance">Rhythm Dance</option><option value="Free Dance">Free Dance</option></select></div>
                                      <div><Label className="text-xs">Place</Label><Input className="h-8 bg-white" type="number" value={seg.placement} onChange={(e) => updateSegment(seg.id, 'placement', e.target.value)} placeholder="#" /></div>
                                  </div>
                                  <div className="grid grid-cols-6 gap-2">
                                      <div className="col-span-2"><Label className="text-xs text-gray-500">Total</Label><Input className="h-8 bg-white font-bold" type="number" step="0.01" value={seg.score} onChange={(e) => updateSegment(seg.id, 'score', e.target.value)} /></div>
                                      <div><Label className="text-xs text-gray-500">TES</Label><Input className="h-8 bg-white" type="number" step="0.01" value={seg.tes} onChange={(e) => updateSegment(seg.id, 'tes', e.target.value)} /></div>
                                      <div><Label className="text-xs text-gray-500">PCS</Label><Input className="h-8 bg-white" type="number" step="0.01" value={seg.pcs} onChange={(e) => updateSegment(seg.id, 'pcs', e.target.value)} /></div>
                                      <div><Label className="text-xs text-red-500">Ded</Label><Input className="h-8 bg-white text-red-600" type="number" step="0.01" value={seg.deductions} onChange={(e) => updateSegment(seg.id, 'deductions', e.target.value)} /></div>
                                      <div><Label className="text-xs text-green-600">Bon</Label><Input className="h-8 bg-white text-green-600" type="number" step="0.01" value={seg.bonus} onChange={(e) => updateSegment(seg.id, 'bonus', e.target.value)} /></div>
                                  </div>

                                  {/* --- PCS DETAILS TOGGLE --- */}
                                  <div className="mt-2">
                                      <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-slate-500" onClick={() => togglePCS(seg.id)}>{expandedPCS === seg.id ? "Hide PCS Details" : "Show PCS Details"}</Button>
                                      {expandedPCS === seg.id && (<div className="grid grid-cols-3 gap-2 mt-1 p-2 bg-slate-100 rounded border border-slate-200 animate-in fade-in slide-in-from-top-1"><div className="col-span-1"><Label className="text-[10px]">Comp</Label><Input className="h-7 text-xs" type="number" step="0.01" value={seg.pcs_composition} onChange={(e)=>updateSegment(seg.id, 'pcs_composition', e.target.value)} /></div><div className="col-span-1"><Label className="text-[10px]">Pres</Label><Input className="h-7 text-xs" type="number" step="0.01" value={seg.pcs_presentation} onChange={(e)=>updateSegment(seg.id, 'pcs_presentation', e.target.value)} /></div><div className="col-span-1"><Label className="text-[10px]">Skills</Label><Input className="h-7 text-xs" type="number" step="0.01" value={seg.pcs_skills} onChange={(e)=>updateSegment(seg.id, 'pcs_skills', e.target.value)} /></div></div>)}
                                  </div>

                                  {/* --- PROTOCOL TOGGLE --- */}
                                  <div className="mt-2 pt-2 border-t border-slate-200">
                                      <Button type="button" variant="ghost" size="sm" className="w-full h-6 text-xs flex justify-between text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={() => toggleProtocol(seg.id)}>
                                          <span>Detailed Protocol / Elements</span>
                                          {expandedProtocol === seg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </Button>
                                      {expandedProtocol === seg.id && (
                                          <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                              <ProtocolEditor elements={seg.protocol || []} onChange={(newProto) => updateProtocol(seg.id, newProto)} />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </>
          )}

          {/* Files Section */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2"><Label>Protocol / Detail Sheet</Label><Input type="file" className="text-xs h-9" onChange={(e) => setDetailSheet(e.target.files[0])} /></div>
              <div className="space-y-2"><Label>Video URL</Label><div className="relative"><Video className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." /></div></div>
          </div>

          <div className="space-y-2 mt-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." /></div>
          <div className="flex justify-between pt-2">
              {!resultToEdit && <Button variant="ghost" onClick={() => { setStep('SEARCH'); setSelectedComp(null); }}>Back</Button>}
              {!resultToEdit && <Button variant="secondary" onClick={handleSaveAndAdd} disabled={loading} className="w-2/3"><Plus className="h-4 w-4 mr-2" /> Save & Add Another</Button>}
              {resultToEdit && <Button onClick={handleSave} disabled={loading} className="w-full">Save Changes</Button>}
          </div>
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Manage Events</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>{step === 'SEARCH' ? 'Find Competition' : step === 'CREATE' ? 'New Event' : (status === 'COMPLETED' ? 'Log Result' : 'Plan Event')}</DialogTitle></DialogHeader>
        {step === 'SEARCH' && (
            <div className="space-y-4"><div className="flex gap-2"><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." /><Button onClick={handleSearch} disabled={loading}><Search className="h-4 w-4" /></Button></div><div className="max-h-[200px] overflow-y-auto space-y-2 border rounded p-2">{searchResults.map(comp => (<div key={comp.id} className="flex justify-between p-2 hover:bg-slate-50 rounded items-center border-b last:border-0"><div className="text-sm"><div className="font-bold">{comp.title}</div><div className="text-xs text-gray-500">{comp.city}, {comp.province_state}</div></div><Button size="sm" variant="outline" onClick={() => { setSelectedComp(comp); setStep('LOG'); }}>Select</Button></div>))}</div><div className="pt-2"><Button variant="secondary" className="w-full" onClick={() => setStep('CREATE')}><Plus className="h-4 w-4 mr-2" /> Create New Competition</Button></div></div>
        )}
        {step === 'CREATE' && (
            <div className="space-y-4"><div className="space-y-2"><Label>Name</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>{renderLocationSelectors()}<div className="grid grid-cols-2 gap-2"><div><Label>Start</Label><DatePicker date={start} setDate={setStart} /></div><div><Label>End</Label><DatePicker date={end} setDate={setEnd} /></div></div><div className="flex justify-between pt-2"><Button variant="ghost" onClick={() => setStep('SEARCH')}>Back</Button><Button onClick={handleCreate} disabled={loading}>Create</Button></div></div>
        )}
        {step === 'LOG' && renderLogStep()}
      </DialogContent>
    </Dialog>
  );
}