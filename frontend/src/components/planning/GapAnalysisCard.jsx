import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Target, ArrowRight, Brain, Zap, Palette, Dumbbell } from 'lucide-react';
import { GoalModal } from './GoalModal';

const CATEGORIES = [
    { id: 'Technical', label: 'Technical', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Artistic', label: 'Artistic', icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'Physical', label: 'Physical', icon: Dumbbell, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'Mental', label: 'Mental', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export function GapAnalysisCard({ planId }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('Technical');

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/ytps/${planId}/gap-analysis/`, 'GET', null, token);
      setItems(data.elements || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (planId) fetchAnalysis(); }, [planId, token]);

  const handleAddItem = () => {
      setItems([...items, { id: Date.now(), category: activeTab, benchmark: '', current: '', strategy: '' }]);
  };

  const handleUpdateItem = (id, field, value) => {
      setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteItem = (id) => {
      setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
      try {
          await apiRequest(`/ytps/${planId}/gap-analysis/`, 'PATCH', { elements: items }, token);
          alert("Gap Analysis saved!");
      } catch (e) { alert("Failed to save."); }
  };

  const filteredItems = items.filter(i => i.category === activeTab);

  if (loading) return <div className="p-8 text-center">Loading analysis...</div>;

  return (
    <Card className="border-2 border-indigo-50 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Target className="h-5 w-5" /></div>
              <div>
                  <CardTitle className="text-lg text-gray-900">Gap Analysis</CardTitle>
                  <p className="text-xs text-muted-foreground">Compare current abilities to required benchmarks.</p>
              </div>
          </div>
          <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
      </CardHeader>
      
      <div className="flex border-b bg-white sticky top-0 z-10">
          {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === cat.id ? `border-indigo-500 text-indigo-700 bg-indigo-50/50` : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-slate-50'}`}>
                  <cat.icon className={`h-4 w-4 ${activeTab === cat.id ? cat.color : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">{cat.label}</span>
              </button>
          ))}
      </div>

      <CardContent className="p-6 bg-slate-50/30 min-h-[300px]">
          <div className="space-y-4">
              {filteredItems.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-white">
                      <p>No gaps identified for {activeTab}.</p>
                  </div>
              )}
              {filteredItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white rounded-lg border shadow-sm relative group">
                      <button onClick={() => handleDeleteItem(item.id)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      
                      <div className="md:col-span-4 space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Benchmark</Label>
                          <Textarea className="min-h-[80px] text-sm bg-slate-50 border-slate-200 resize-none" value={item.benchmark} onChange={(e) => handleUpdateItem(item.id, 'benchmark', e.target.value)} placeholder="Gold standard..." />
                      </div>
                      <div className="md:col-span-4 space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Current State</Label>
                          <Textarea className="min-h-[80px] text-sm bg-white border-slate-200 resize-none" value={item.current} onChange={(e) => handleUpdateItem(item.id, 'current', e.target.value)} placeholder="Current reality..." />
                      </div>
                      <div className="md:col-span-4 space-y-1.5 flex flex-col h-full">
                          <Label className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">Strategy / Action</Label>
                          <Textarea className="min-h-[80px] text-sm bg-indigo-50/50 border-indigo-100 resize-none focus:border-indigo-300" value={item.strategy} onChange={(e) => handleUpdateItem(item.id, 'strategy', e.target.value)} placeholder="Plan to close gap..." />
                          
                          <div className="mt-auto pt-2 flex justify-end">
                              <GoalModal 
                                  planId={planId} 
                                  defaultValues={{ title: `Improve ${activeTab}: ${item.benchmark.slice(0, 20)}...`, description: `Strategy: ${item.strategy}\n\nTarget: ${item.benchmark}\nCurrent: ${item.current}`, type: 'Technical' }}
                                  trigger={<Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"><ArrowRight className="h-3 w-3 mr-1" /> Create Goal</Button>}
                              />
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          <div className="mt-6 text-center">
              <Button variant="outline" onClick={handleAddItem} className="w-full border-dashed text-gray-500 hover:text-gray-800 hover:bg-slate-50"><Plus className="h-4 w-4 mr-2" /> Add {activeTab} Gap</Button>
          </div>
      </CardContent>
    </Card>
  );
}