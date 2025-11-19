import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MacrocycleModal } from '@/components/planning/MacrocycleModal';
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react';

export default function YearlyPlanEditor() {
  const { token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get ID from hash (e.g., #/plans/15)
  const planId = window.location.hash.split('/')[2];

  // --- DATA FETCHING ---
  const fetchPlan = async () => {
    try {
      const data = await apiRequest(`/ytps/${planId}/`, 'GET', null, token);
      setPlan(data);
    } catch (err) {
      console.error("Error fetching plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [planId, token]);

  // --- HANDLERS ---
  const handleUpdateDetails = async () => {
    try {
      await apiRequest(`/ytps/${planId}/`, 'PATCH', {
        peak_type: plan.peak_type,
        primary_season_goal: plan.primary_season_goal
      }, token);
      alert("Plan details saved.");
    } catch (err) {
      alert("Failed to save details.");
    }
  };

  const handleDeleteMacrocycle = async (id) => {
    if(!confirm("Delete this phase?")) return;
    try {
        await apiRequest(`/macrocycles/${id}/`, 'DELETE', null, token);
        fetchPlan(); // Refresh list
    } catch(err) {
        alert("Failed to delete.");
    }
  }

  if (loading) return <div className="p-8">Loading plan...</div>;
  if (!plan) return <div className="p-8">Plan not found.</div>;

  // Sort macrocycles by date
  const sortedCycles = plan.macrocycles?.sort((a, b) => new Date(a.phase_start) - new Date(b.phase_start)) || [];

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <a href={`#/skater/${plan.planning_entity?.skater?.id || ''}`}>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </a>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{plan.discipline_name} Plan</h1>
                <p className="text-muted-foreground">Yearly Training Plan Editor</p>
            </div>
        </div>
        <Button onClick={handleUpdateDetails}>Save Changes</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Plan Settings */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Plan Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Peaking Strategy</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={plan.peak_type || ''}
                            onChange={(e) => setPlan({...plan, peak_type: e.target.value})}
                        >
                            <option value="Single Peak">Single Peak</option>
                            <option value="Double Peak">Double Peak</option>
                            <option value="Triple Peak">Triple Peak</option>
                            <option value="Development">Development</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Primary Season Goal</Label>
                        <textarea 
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={plan.primary_season_goal || ''}
                            onChange={(e) => setPlan({...plan, primary_season_goal: e.target.value})}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: Timeline (Macrocycles) */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Season Timeline</CardTitle>
                    <MacrocycleModal planId={plan.id} onSaved={fetchPlan} />
                </CardHeader>
                <CardContent>
                    {sortedCycles.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                            No phases defined yet. Click "Add Phase" to build your timeline.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedCycles.map((cycle) => (
                                <div key={cycle.id} className="flex items-start justify-between p-4 border rounded-lg bg-white hover:border-brand-blue transition-colors">
                                    <div>
                                        <h4 className="font-semibold text-lg">{cycle.phase_title}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{cycle.phase_start} to {cycle.phase_end}</span>
                                        </div>
                                        {cycle.phase_focus && (
                                            <p className="text-sm mt-2 text-gray-700 bg-slate-50 p-2 rounded">
                                                <span className="font-medium">Focus:</span> {cycle.phase_focus}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <MacrocycleModal 
                                            planId={plan.id} 
                                            macrocycle={cycle} 
                                            onSaved={fetchPlan} 
                                            trigger={
                                                <Button variant="outline" size="sm">Edit</Button>
                                            }
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDeleteMacrocycle(cycle.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}