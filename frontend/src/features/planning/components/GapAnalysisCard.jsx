import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Lock, Zap, Palette, Dumbbell, Brain } from 'lucide-react';

// Define categories
const CATEGORIES = [
    { id: 'Technical', label: 'Tech', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Artistic', label: 'Artistic', icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'Physical', label: 'Phys', icon: Dumbbell, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'Mental', label: 'Mental', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export function GapAnalysisCard({ planId, entityType, entityId, readOnly }) {
  const { token } = useAuth();
  const [gapData, setGapData] = useState({ elements_status: [], notes: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Technical');

  const getUrl = () => {
      if (planId) return `/ytps/${planId}/gap-analysis/`;
      if (entityType === 'synchro') return `/synchro/${entityId}/gap-analysis/`;
      if (entityType === 'team') return `/teams/${entityId}/gap-analysis/`;
      if (entityType === 'skater' || (!entityType && entityId)) return `/skaters/${entityId}/gap-analysis/`;
      return null;
  };

  const fetchData = async () => {
      const url = getUrl();
      if (!url) return;
      try {
          setLoading(true);
          const data = await apiRequest(url, 'GET', null, token);
          
          let elements = data.elements_status;
          if (!Array.isArray(elements)) elements = [];
          
          setGapData({ ...data, elements_status: elements });
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [planId, entityType, entityId, token]);

  const handleSave = async () => {
      if (readOnly) return;
      const url = getUrl();
      if (!url) return;
      try {
          await apiRequest(url, 'PATCH', {
              elements_status: gapData.elements_status,
              notes: gapData.notes
          }, token);
          alert("Gap Analysis Saved");
      } catch (e) { alert("Failed to save"); }
  };

  const addItem = () => {
      const newData = { ...gapData };
      newData.elements_status.push({ 
          id: Date.now(), 
          category: activeTab, 
          name: '', current: '', goal: '', strategy: '' 
      });
      setGapData(newData);
  };

  const updateItem = (id, field, value) => {
      const newData = { ...gapData };
      const index = newData.elements_status.findIndex(i => i.id === id);
      if (index !== -1) {
          newData.elements_status[index][field] = value;
          setGapData(newData);
      }
  };

  const removeItem = (id) => {
      const newData = { ...gapData };
      newData.elements_status = newData.elements_status.filter(i => i.id !== id);
      setGapData(newData);
  };

  const visibleItems = gapData.elements_status.filter(i => i.category === activeTab);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading analysis...</div>;
  if (!gapData) return null;

  return (
    // FIX: Removed h-full and flex-col to prevent stretching in grid columns
    <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg">Gap Analysis</CardTitle>
            {readOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> View Only</span>}
        </CardHeader>
        
        <div className="flex border-b px-2">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1 border-b-2 transition-colors ${
                        activeTab === cat.id 
                            ? `border-indigo-500 text-indigo-700` 
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <cat.icon className="h-3 w-3" />
                    {cat.label}
                </button>
            ))}
        </div>

        {/* FIX: Removed flex-1, overflow-y-auto, and min-h to allow natural height */}
        <CardContent className="space-y-4 pt-4">
            
            {visibleItems.length === 0 && (
                <div className="text-center p-4 border-2 border-dashed rounded bg-slate-50">
                    <p className="text-xs text-muted-foreground">No {activeTab} gaps tracked.</p>
                </div>
            )}

            {visibleItems.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded border border-slate-100 relative group text-xs">
                    {!readOnly && (
                        <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                    
                    {/* Element & Goal */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <Label className="text-[9px] text-gray-400 uppercase">Element/Area</Label>
                            <Input className="h-7 text-xs font-bold" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="e.g. Speed" disabled={readOnly} />
                        </div>
                        <div className="pr-5">
                            <Label className="text-[9px] text-gray-400 uppercase">Benchmark</Label>
                            <Input className="h-7 text-xs" value={item.goal} onChange={(e) => updateItem(item.id, 'goal', e.target.value)} placeholder="Target..." disabled={readOnly} />
                        </div>
                    </div>

                    {/* Current & Strategy */}
                    <div className="space-y-2">
                        <div>
                            <Label className="text-[9px] text-gray-400 uppercase">Current State</Label>
                            <Input className="h-7 text-xs bg-white" value={item.current} onChange={(e) => updateItem(item.id, 'current', e.target.value)} placeholder="Reality..." disabled={readOnly} />
                        </div>
                        <div>
                            <Label className="text-[9px] text-indigo-400 uppercase font-bold">Action Plan</Label>
                            <Input 
                                className="h-7 text-xs bg-white border-indigo-100 focus:border-indigo-300" 
                                value={item.strategy} 
                                onChange={(e) => updateItem(item.id, 'strategy', e.target.value)} 
                                placeholder="Fix..." 
                                disabled={readOnly} 
                            />
                        </div>
                    </div>
                </div>
            ))}

            {!readOnly && (
                <Button variant="outline" size="sm" onClick={addItem} className="w-full h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add {activeTab} Gap
                </Button>
            )}

            <div className="pt-4 border-t">
                <Label className="text-xs">General Notes</Label>
                <Textarea 
                    value={gapData.notes || ''} 
                    onChange={(e) => setGapData({ ...gapData, notes: e.target.value })} 
                    className="min-h-[60px] text-xs"
                    disabled={readOnly}
                />
            </div>

            {!readOnly && (
                <Button onClick={handleSave} className="w-full h-8 text-xs"><Save className="h-3 w-3 mr-2" /> Save Changes</Button>
            )}
        </CardContent>
    </Card>
  );
}