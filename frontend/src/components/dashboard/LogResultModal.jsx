import React, { useState } from 'react';
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

export function LogResultModal({ skater, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [step, setStep] = useState('SEARCH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search & Create State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [countryCode, setCountryCode] = useState('CA');
  const [stateCode, setStateCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Result State
  const [level, setLevel] = useState('');
  const [overallPlacement, setOverallPlacement] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [notes, setNotes] = useState('');
  
  // Segment State
  const [segments, setSegments] = useState([]);

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
          if (e.message && e.message.includes('duplicate')) {
              setError("A similar event already exists.");
          } else {
              setError("Failed to create event.");
          }
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
          deductions: '', // Separate field
          bonus: '',      // Separate field
          placement: '' 
      }]);
  };

  const removeSegment = (id) => {
      setSegments(segments.filter(s => s.id !== id));
  };

  const updateSegment = (id, field, value) => {
      setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveResult = async () => {
      setLoading(true);
      try {
          await apiRequest(`/skaters/${skater.id}/results/`, 'POST', {
              competition_id: selectedComp.id,
              level,
              placement: overallPlacement,
              total_score: overallScore,
              notes,
              segment_scores: segments
          }, token);
          onSaved();
          setOpen(false);
          // Reset
          setStep('SEARCH');
          setSearchTerm('');
          setSelectedComp(null);
          setSegments([]);
          setLevel(''); setOverallPlacement(''); setOverallScore(''); setNotes('');
      } catch (e) { alert("Failed to save result."); }
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
                  <Label>Level</Label>
                  <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Junior Women" />
              </div>
              <div className="space-y-2">
                  <Label>Overall Placement</Label>
                  <Input type="number" value={overallPlacement} onChange={(e) => setOverallPlacement(e.target.value)} placeholder="#" />
              </div>
          </div>
          <div className="space-y-2">
              <Label>Total Competition Score</Label>
              <Input type="number" step="0.01" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} placeholder="e.g. 150.25" />
          </div>

          {/* --- SEGMENTS EDITOR --- */}
          <div className="border-t pt-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                  <Label className="text-gray-900 font-bold">Segments & Protocols</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addSegment}>
                      <Plus className="h-3 w-3 mr-1" /> Add Segment
                  </Button>
              </div>
              
              <div className="space-y-3">
                  {segments.map((seg, idx) => (
                      <div key={seg.id} className="p-3 border rounded-md bg-slate-50 relative">
                          <Button 
                            type="button" variant="ghost" size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-red-500"
                            onClick={() => removeSegment(seg.id)}
                          >
                              <Trash2 className="h-3 w-3" />
                          </Button>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                              <div className="col-span-2 sm:col-span-1">
                                <Label className="text-xs">Segment Name</Label>
                                <select 
                                    className="flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs"
                                    value={seg.name}
                                    onChange={(e) => updateSegment(seg.id, 'name', e.target.value)}
                                >
                                    <option value="Short Program">Short Program</option>
                                    <option value="Free Skate">Free Skate</option>
                                    <option value="Pattern Dance">Pattern Dance</option>
                                    <option value="Rhythm Dance">Rhythm Dance</option>
                                    <option value="Free Dance">Free Dance</option>
                                    <option value="Artistic">Artistic</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Segment Place</Label>
                                <Input className="h-8 bg-white" type="number" value={seg.placement} onChange={(e) => updateSegment(seg.id, 'placement', e.target.value)} placeholder="#" />
                              </div>
                          </div>

                          {/* UPDATED GRID FOR SPLIT DEDUCTIONS/BONUS */}
                          <div className="grid grid-cols-6 gap-2">
                              <div className="col-span-2">
                                  <Label className="text-xs text-gray-500">Total</Label>
                                  <Input className="h-8 bg-white font-bold" type="number" step="0.01" value={seg.score} onChange={(e) => updateSegment(seg.id, 'score', e.target.value)} />
                              </div>
                              <div>
                                  <Label className="text-xs text-gray-500">TES</Label>
                                  <Input className="h-8 bg-white" type="number" step="0.01" value={seg.tes} onChange={(e) => updateSegment(seg.id, 'tes', e.target.value)} />
                              </div>
                              <div>
                                  <Label className="text-xs text-gray-500">PCS</Label>
                                  <Input className="h-8 bg-white" type="number" step="0.01" value={seg.pcs} onChange={(e) => updateSegment(seg.id, 'pcs', e.target.value)} />
                              </div>
                              <div>
                                  <Label className="text-xs text-red-500">Ded</Label>
                                  <Input className="h-8 bg-white text-red-600" type="number" step="0.01" value={seg.deductions} onChange={(e) => updateSegment(seg.id, 'deductions', e.target.value)} />
                              </div>
                              <div>
                                  <Label className="text-xs text-green-600">Bon</Label>
                                  <Input className="h-8 bg-white text-green-600" type="number" step="0.01" value={seg.bonus} onChange={(e) => updateSegment(seg.id, 'bonus', e.target.value)} />
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="space-y-2 mt-4">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Personal best? Technical issues?" />
          </div>

          <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => { setStep('SEARCH'); setSelectedComp(null); setSegments([]); }}>Back</Button>
              <Button onClick={handleSaveResult} disabled={loading}>Save Result</Button>
          </div>
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Log Result</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
            <DialogTitle>
                {step === 'SEARCH' ? 'Find Competition' : step === 'CREATE' ? 'New Event' : 'Log Result'}
            </DialogTitle>
        </DialogHeader>
        
        {step === 'SEARCH' && (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search (e.g. Sectionals)..." />
                    <Button onClick={handleSearch} disabled={loading}><Search className="h-4 w-4" /></Button>
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded p-2">
                    {searchResults.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No events found.</p>}
                    {searchResults.map(comp => (
                        <div key={comp.id} className="flex justify-between p-2 hover:bg-slate-50 rounded items-center border-b last:border-0">
                            <div className="text-sm">
                                <div className="font-bold">{comp.title}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {comp.city}, {comp.province_state}
                                </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedComp(comp); setStep('LOG'); }}>Select</Button>
                        </div>
                    ))}
                </div>
                <div className="pt-2">
                    <Button variant="secondary" className="w-full" onClick={() => setStep('CREATE')}>
                        <Plus className="h-4 w-4 mr-2" /> Create New Competition
                    </Button>
                </div>
            </div>
        )}

        {step === 'CREATE' && (
            <div className="space-y-4">
                {error && <div className="p-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">{error}</div>}
                <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="2026 Sectionals" />
                </div>
                {renderLocationSelectors()}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label>Start Date</Label><DatePicker date={start} setDate={setStart} /></div>
                    <div className="space-y-1"><Label>End Date</Label><DatePicker date={end} setDate={setEnd} /></div>
                </div>
                <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => { setStep('SEARCH'); setError(null); }}>Back</Button>
                    <Button onClick={handleCreate} disabled={loading}>Create & Continue</Button>
                </div>
            </div>
        )}

        {step === 'LOG' && renderLogStep()}

      </DialogContent>
    </Dialog>
  );
}