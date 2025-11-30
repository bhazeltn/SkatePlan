import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Added Input
import { Plus, Trash2, Save, Zap, Palette, Dumbbell, Brain } from 'lucide-react';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
    { id: 'Technical', label: 'Technical', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Artistic', label: 'Artistic / Components', icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'Physical', label: 'Physical Capacity', icon: Dumbbell, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'Mental', label: 'Mental & Self', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export function GapAnalysisTab({ skater, team, isSynchro, readOnly }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('Technical');

  // --- DYNAMIC URL ---
  let fetchUrl = '';
  if (isSynchro) fetchUrl = `/synchro/${team.id}/gap-analysis/`;
  else if (team) fetchUrl = `/teams/${team.id}/gap-analysis/`;
  else fetchUrl = `/skaters/${skater.id}/gap-analysis/`;

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(fetchUrl, 'GET', null, token);
      // FIX: Read from elements_status
      let loadedItems = data.elements_status;
      if (!Array.isArray(loadedItems)) loadedItems = []; // Handle legacy dict or null
      setItems(loadedItems);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (skater || team) fetchAnalysis(); }, [skater, team, token]);

  const handleAddItem = () => {
      // Schema: category, name (Element), current, goal (Benchmark), strategy
      setItems([...items, { id: Date.now(), category: activeTab, name: '', current: '', goal: '', strategy: '' }]);
  };
  
  const handleUpdateItem = (id, field, value) => {
      setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const handleDeleteItem = (id) => {
      setItems(items.filter(item => item.id !== id));
  };
  
  const handleSave = async () => {
      try {
          // FIX: Save to elements_status
          await apiRequest(fetchUrl, 'PATCH', { elements_status: items }, token);
          alert("Analysis saved!");
      } catch (e) { alert("Failed to save."); }
  };

  const filteredItems = items.filter(i => i.category === activeTab);

  if (loading) return <div className="p-8 text-center">Loading analysis...</div>;

  return (
    <div className="space-y-6">
        
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Gap Analysis</h3>
            <p className="text-sm text-muted-foreground">Continuous assessment of performance gaps.</p>
        </div>
        {!readOnly && (
             <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
        )}
      </div>

      <Card className="min-h-[500px] flex flex-col">
          {/* Tab Bar */}
          <div className="flex border-b overflow-x-auto">
              {CATEGORIES.map(cat => (
                  <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                          activeTab === cat.id 
                              ? `border-indigo-500 text-indigo-700 bg-indigo-50/50` 
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                      }`}
                  >
                      <cat.icon className={`h-4 w-4 ${activeTab === cat.id ? cat.color : 'text-gray-400'}`} />
                      {cat.label}
                  </button>
              ))}
          </div>

          <CardContent className="p-6 bg-slate-50/30 flex-1">
              <div className="space-y-4">
                  {filteredItems.length === 0 && (
                      <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-white">
                          <p>No gaps identified for {activeTab}.</p>
                      </div>
                  )}

                  {filteredItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 bg-white rounded-lg border shadow-sm relative group">
                          {!readOnly && (
                              <button onClick={() => handleDeleteItem(item.id)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          )}
                          
                          {/* Top Row: Element Name */}
                          <div className="lg:col-span-12 space-y-1">
                               <Label className="text-[10px] font-bold uppercase text-gray-500">Element / Area</Label>
                               <Input className="font-bold" value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} placeholder="e.g. Double Axel" disabled={readOnly} />
                          </div>

                          {/* Current State */}
                          <div className="lg:col-span-6 space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Current State</Label>
                              <Textarea className="min-h-[60px] text-sm bg-slate-50 border-slate-200 resize-none" value={item.current} onChange={(e) => handleUpdateItem(item.id, 'current', e.target.value)} placeholder="Current reality..." disabled={readOnly} />
                          </div>

                          {/* Benchmark / Goal */}
                          <div className="lg:col-span-6 space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Benchmark / Goal</Label>
                              <Textarea className="min-h-[60px] text-sm bg-white border-slate-200 resize-none" value={item.goal} onChange={(e) => handleUpdateItem(item.id, 'goal', e.target.value)} placeholder="Target standard..." disabled={readOnly} />
                          </div>
                          
                          {/* Strategy */}
                          <div className="lg:col-span-12 space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">Strategy / Action Plan</Label>
                              <Textarea className="min-h-[60px] text-sm bg-indigo-50/50 border-indigo-100 resize-none focus:border-indigo-300" value={item.strategy} onChange={(e) => handleUpdateItem(item.id, 'strategy', e.target.value)} placeholder="Action steps..." disabled={readOnly} />
                          </div>
                      </div>
                  ))}
              </div>

              {!readOnly && (
                  <div className="mt-6 text-center">
                      <Button variant="outline" onClick={handleAddItem} className="w-full border-dashed text-gray-500 hover:text-gray-800 hover:bg-slate-50"><Plus className="h-4 w-4 mr-2" /> Add {activeTab} Gap</Button>
                  </div>
              )}
          </CardContent>
      </Card>
    </div>
  );
}