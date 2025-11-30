import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Lock } from 'lucide-react';

export function GapAnalysisCard({ planId, entityType, entityId, readOnly }) {
  const { token } = useAuth();
  const [gapData, setGapData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to build URL
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
          // Ensure structure exists
          if (!data.elements_status) data.elements_status = {};
          if (!data.elements_status.technical) data.elements_status.technical = [];
          setGapData(data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [planId, entityType, entityId, token]);

  const handleSave = async () => {
      if (readOnly) return;
      const url = getUrl();
      if (!url || !gapData) return;
      
      try {
          await apiRequest(url, 'PATCH', {
              elements_status: gapData.elements_status,
              notes: gapData.notes
          }, token);
          alert("Gap Analysis Saved");
      } catch (e) { alert("Failed to save"); }
  };

  const addTechnicalItem = () => {
      const newData = { ...gapData };
      newData.elements_status.technical.push({ name: '', current: '', goal: '' });
      setGapData(newData);
  };

  const updateTechnicalItem = (index, field, value) => {
      const newData = { ...gapData };
      newData.elements_status.technical[index][field] = value;
      setGapData(newData);
  };

  const removeTechnicalItem = (index) => {
      const newData = { ...gapData };
      newData.elements_status.technical.splice(index, 1);
      setGapData(newData);
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading analysis...</div>;
  if (!gapData) return null;

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Gap Analysis</CardTitle>
            {readOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> View Only</span>}
        </CardHeader>
        <CardContent className="space-y-6">
            
            {/* Technical Elements Table */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase text-gray-500">Technical Elements</Label>
                    {!readOnly && <Button variant="outline" size="sm" onClick={addTechnicalItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
                </div>
                
                <div className="space-y-2">
                    {gapData.elements_status.technical?.length === 0 && <p className="text-sm italic text-gray-400">No specific elements tracked.</p>}
                    {gapData.elements_status.technical?.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4"><Input placeholder="Element" value={item.name} onChange={(e) => updateTechnicalItem(i, 'name', e.target.value)} className="h-8 text-sm" disabled={readOnly} /></div>
                            <div className="col-span-3"><Input placeholder="Current" value={item.current} onChange={(e) => updateTechnicalItem(i, 'current', e.target.value)} className="h-8 text-sm" disabled={readOnly} /></div>
                            <div className="col-span-4"><Input placeholder="Goal" value={item.goal} onChange={(e) => updateTechnicalItem(i, 'goal', e.target.value)} className="h-8 text-sm" disabled={readOnly} /></div>
                            <div className="col-span-1">
                                {!readOnly && <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => removeTechnicalItem(i)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label>Analysis Notes</Label>
                <Textarea 
                    value={gapData.notes || ''} 
                    onChange={(e) => setGapData({ ...gapData, notes: e.target.value })} 
                    placeholder="Strengths, weaknesses, areas to improve..."
                    className="min-h-[100px]"
                    disabled={readOnly}
                />
            </div>

            {!readOnly && (
                <Button onClick={handleSave} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
            )}

        </CardContent>
    </Card>
  );
}