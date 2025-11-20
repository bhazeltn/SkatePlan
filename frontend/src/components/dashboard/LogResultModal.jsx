import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, Plus, MapPin, Trash2 } from 'lucide-react';
import { Country, State, City } from 'country-state-city';

export function LogResultModal({ skater, resultToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  
  // If editing an existing result/plan, start at LOG step
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

  // Result / Plan State
  const [selectedEntityId, setSelectedEntityId] = useState(skater?.planning_entities?.[0]?.id || '');
  
  // Status State
  const [status, setStatus] = useState(resultToEdit?.status || 'COMPLETED'); 

  const [level, setLevel] = useState(resultToEdit?.level || '');
  const [placement, setPlacement] = useState(resultToEdit?.placement || '');
  const [overallScore, setOverallScore] = useState(resultToEdit?.total_score || '');
  const [notes, setNotes] = useState(resultToEdit?.notes || '');
  const [segments, setSegments] = useState(resultToEdit?.segment_scores || []);

  // --- AUTO-CALCULATE TOTAL SCORE ---
  useEffect(() => {
      if (segments.length > 0 && status === 'COMPLETED') {
          const total = segments.reduce((sum, seg) => sum + (parseFloat(seg.score) || 0), 0);
          setOverallScore(total > 0 ? total.toFixed(2) : '');
      }
  }, [segments, status]);

  // --- HANDLERS ---

  const handleSearch = async () => {
      setLoading(true);
      setError(null);
      try {
          const data = await apiRequest(`/competitions/?search=${searchTerm}`, 'GET', null, token);
          setSearchResults(data || []);
      } catch(e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const handleCreate = async () => {
      setLoading(true);
      setError(null);
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
      } catch (e) {
          if (e.message && e.message.includes('duplicate')) setError("Event exists.");
          else setError("Failed to create.");
      } finally { setLoading(false); }
  };

  // --- SEGMENT HANDLERS ---
  const addSegment = () => {
      setSegments([...segments, { 
          id: Date.now(), 
          name: 'Short Program', 
          score: '', 
          tes: '', 
          pcs: '', 
          deductions: '', 
          bonus: '', 
          placement: '' 
      }]);
  };
  const removeSegment = (id) => setSegments(segments.filter(s => s.id !== id));
  const updateSegment = (id, field, value) => setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));

  const handleSave = async () => {
      setLoading(true);
      try {
          const payload = {
              competition_id: selectedComp.id,
              planning_entity_id: selectedEntityId,
              status, 
              level,
              notes,
              placement: status === 'COMPLETED' ? placement : null,
              total_score: status === 'COMPLETED' ? overallScore : null,
              segment_scores: status === 'COMPLETED' ? segments : []
          };

          if (resultToEdit) {
              await apiRequest(`/results/${resultToEdit.id}/`, 'PATCH', payload, token);
          } else {
              await apiRequest(`/skaters/${skater.id}/results/`, 'POST', payload, token);
          }
          
          // THIS WAS THE ISSUE: Ensure we call onSaved(), NOT fetchResults()
          if (onSaved) onSaved();
          
          setOpen(false);
      } catch (e) { alert("Failed to save."); }
      finally { setLoading(false); }
  };

  // --- RENDER HELPERS ---

  const renderLocationSelectors = () => {
      const countries = Country.getAllCountries();
      const states = State.getStatesOfCountry(countryCode);
      const cities = City.getCitiesOfState(countryCode, stateCode);
      return (
          <div className="space-y-3 p-3 bg-slate-50 rounded border">
             <div className="grid grid-cols-2 gap-2">
                  <div>
                      <Label className="text-xs">Country</Label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); setCityName(''); }}>
                          {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <Label className="text-xs">Prov/State</Label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={stateCode} onChange={(e) => { setStateCode(e.target.value); setCityName(''); }} disabled={!countryCode}>
                          <option value="">Select...</option>
                          {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                      </select>
                  </div>
              </div>
              <div>
                  <Label className="text-xs">City</Label>
                  {cities.length > 0 ? (
                      <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={cityName} onChange={(e) => setCityName(e.target.value)} disabled={!stateCode}>
                          <option value="">Select City...</option>
                          {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                  ) : (
                      <Input value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="Enter City Name" />
                  )}
              </div>
          </div>
      );
  };

  const renderLogStep = () => (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-slate-100 p-3 rounded text-sm font-medium border">
              {selectedComp?.title} <span className="text-gray-500 font-normal">({selectedComp?.city})</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Discipline</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm" value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}>
                      {skater?.planning_entities?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
              </div>
              
              <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm font-medium" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="PLANNED">Planned</option>
                      <option value="REGISTERED">Registered</option>
                      <option value="COMPLETED">Completed</option>
                  </select>
              </div>
          </div>

          <div className="space-y-2">
              <Label>Event Level / Category</Label>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Junior Women" />
          </div>

          {status === 'COMPLETED' && (
              <>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Placement</Label>
                          <Input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="#" />
                      </div>
                      <div className="space-y-2">
                          <Label>Total Score</Label>
                          <Input type="number" step="0.01" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} disabled={segments.length > 0} className={segments.length > 0 ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""} />
                          {segments.length > 0 && <p className="text-xs text-muted-foreground">Calculated automatically from segments.</p>}
                      </div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                      <div className="flex justify-between items-center mb-3">
                          <Label className="text-gray-900 font-bold">Segments & Protocols</Label>
                          <Button type="button" size="sm" variant="outline" onClick={addSegment}><Plus className="h-3 w-3 mr-1" /> Add Segment</Button>
                      </div>
                      <div className="space-y-3">
                          {segments.map((seg) => (
                              <div key={seg.id} className="p-3 border rounded-md bg-slate-50 relative">
                                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => removeSegment(seg.id)}><Trash2 className="h-3 w-3" /></Button>
                                  
                                  <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                                      <div className="col-span-2 sm:col-span-1">
                                        <Label className="text-xs">Segment</Label>
                                        <select className="flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs" value={seg.name} onChange={(e) => updateSegment(seg.id, 'name', e.target.value)}>
                                            <option value="Short Program">Short Program</option>
                                            <option value="Free Skate">Free Skate</option>
                                            <option value="Pattern Dance">Pattern Dance</option>
                                            <option value="Rhythm Dance">Rhythm Dance</option>
                                            <option value="Free Dance">Free Dance</option>
                                            <option value="Artistic">Artistic</option>
                                        </select>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Place</Label>
                                        <Input className="h-8 bg-white" type="number" value={seg.placement} onChange={(e) => updateSegment(seg.id, 'placement', e.target.value)} placeholder="#" />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-6 gap-2">
                                      <div className="col-span-2"><Label className="text-xs text-gray-500">Total</Label><Input className="h-8 bg-white font-bold" type="number" step="0.01" value={seg.score} onChange={(e) => updateSegment(seg.id, 'score', e.target.value)} /></div>
                                      <div><Label className="text-xs text-gray-500">TES</Label><Input className="h-8 bg-white" type="number" step="0.01" value={seg.tes} onChange={(e) => updateSegment(seg.id, 'tes', e.target.value)} /></div>
                                      <div><Label className="text-xs text-gray-500">PCS</Label><Input className="h-8 bg-white" type="number" step="0.01" value={seg.pcs} onChange={(e) => updateSegment(seg.id, 'pcs', e.target.value)} /></div>
                                      <div><Label className="text-xs text-red-500">Ded</Label><Input className="h-8 bg-white text-red-600" type="number" step="0.01" value={seg.deductions} onChange={(e) => updateSegment(seg.id, 'deductions', e.target.value)} /></div>
                                      <div><Label className="text-xs text-green-600">Bon</Label><Input className="h-8 bg-white text-green-600" type="number" step="0.01" value={seg.bonus} onChange={(e) => updateSegment(seg.id, 'bonus', e.target.value)} /></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </>
          )}

          <div className="space-y-2 mt-4">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Planning notes or results comments..." />
          </div>

          <div className="flex justify-between pt-2">
              {!resultToEdit && <Button variant="ghost" onClick={() => { setStep('SEARCH'); setSelectedComp(null); }}>Back</Button>}
              <Button onClick={handleSave} disabled={loading} className={!resultToEdit ? "" : "w-full"}>
                  {status === 'COMPLETED' ? 'Save Result' : 'Save Plan'}
              </Button>
          </div>
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Manage Events</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
            <DialogTitle>
                {step === 'SEARCH' ? 'Find Competition' : step === 'CREATE' ? 'New Event' : (status === 'COMPLETED' ? 'Log Result' : 'Plan Event')}
            </DialogTitle>
        </DialogHeader>
        {step === 'SEARCH' && (
            <div className="space-y-4">
                <div className="flex gap-2"><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." /><Button onClick={handleSearch} disabled={loading}><Search className="h-4 w-4" /></Button></div>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded p-2">
                    {searchResults.map(comp => (
                        <div key={comp.id} className="flex justify-between p-2 hover:bg-slate-50 rounded items-center border-b last:border-0">
                            <div className="text-sm"><div className="font-bold">{comp.title}</div><div className="text-xs text-gray-500">{comp.city}, {comp.province_state}</div></div>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedComp(comp); setStep('LOG'); }}>Select</Button>
                        </div>
                    ))}
                </div>
                <div className="pt-2"><Button variant="secondary" className="w-full" onClick={() => setStep('CREATE')}><Plus className="h-4 w-4 mr-2" /> Create New Competition</Button></div>
            </div>
        )}
        {step === 'CREATE' && (
            <div className="space-y-4">
                {error && <div className="p-2 bg-red-50 text-red-600 text-sm rounded">{error}</div>}
                <div className="space-y-2"><Label>Name</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
                {renderLocationSelectors()}
                <div className="grid grid-cols-2 gap-2"><div><Label>Start</Label><DatePicker date={start} setDate={setStart} /></div><div><Label>End</Label><DatePicker date={end} setDate={setEnd} /></div></div>
                <div className="flex justify-between pt-2"><Button variant="ghost" onClick={() => setStep('SEARCH')}>Back</Button><Button onClick={handleCreate} disabled={loading}>Create</Button></div>
            </div>
        )}
        {step === 'LOG' && renderLogStep()}
      </DialogContent>
    </Dialog>
  );
}