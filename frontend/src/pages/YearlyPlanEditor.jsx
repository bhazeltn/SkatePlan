import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { MacrocycleModal } from '@/components/planning/MacrocycleModal';
import { GoalModal } from '@/components/planning/GoalModal';
import { GapAnalysisCard } from '@/components/planning/GapAnalysisCard'; 
import { 
    ArrowLeft, Calendar, CheckCircle2, Circle, Trash2, Pencil,
    Zap, Palette, Dumbbell, Brain 
} from 'lucide-react';

// Helper for date format
const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function YearlyPlanEditor() {
  const { token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  
  const planId = window.location.hash.split('/')[2];

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

  const fetchGoals = async () => {
      try {
          const data = await apiRequest(`/ytps/${planId}/goals/`, 'GET', null, token);
          setGoals(data || []);
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      fetchPlan();
      fetchGoals(); 
  }, [planId, token]);

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
        fetchPlan(); 
    } catch(err) {
        alert("Failed to delete.");
    }
  }

  const handleDeletePlan = async () => {
      if (!confirm("Are you sure you want to DELETE this entire plan? This cannot be undone.")) return;
      try {
          await apiRequest(`/ytps/${planId}/`, 'DELETE', null, token);
          // Redirect back to the correct dashboard using the smart URL
          window.location.hash = plan.dashboard_url || '#/';
      } catch (err) {
          alert("Failed to delete plan.");
      }
  };

  const getNextDay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1); 
    return date.toISOString().split('T')[0];
  };

  if (loading) return <div className="p-8">Loading plan...</div>;
  if (!plan) return <div className="p-8">Plan not found.</div>;

  const sortedCycles = plan.macrocycles?.sort((a, b) => new Date(a.phase_start) - new Date(b.phase_start)) || [];

  let defaultStart = '';
  if (sortedCycles.length > 0) {
      const lastPhase = sortedCycles[sortedCycles.length - 1];
      defaultStart = getNextDay(lastPhase.phase_end);
  } else {
      defaultStart = plan.season_info?.start_date || '';
  }
  const defaultEnd = plan.season_info?.end_date || '';

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <a href={plan.dashboard_url || '#/'}>
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </a>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{plan.discipline_name} Plan</h1>
                <p className="text-muted-foreground">Yearly Training Plan Editor</p>
            </div>
        </div>
        
        <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDeletePlan}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Plan
            </Button>
            <Button onClick={handleUpdateDetails}>Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Strategy & Analysis */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Basic Strategy */}
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
                        <Textarea 
                            className="flex min-h-[100px]"
                            value={plan.primary_season_goal || ''}
                            onChange={(e) => setPlan({...plan, primary_season_goal: e.target.value})}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 2. Gap Analysis */}
            <GapAnalysisCard planId={planId} />
            
            {/* 3. Linked Goals */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Season Goals</CardTitle>
                    <GoalModal planId={planId} onSaved={fetchGoals} />
                </CardHeader>
                <CardContent>
                    {goals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No goals set.</p>
                    ) : (
                        <div className="space-y-3">
                            {goals.map(goal => (
                                <div key={goal.id} className="flex items-start gap-3 p-3 border rounded-md hover:bg-slate-50 group bg-white">
                                    {goal.current_status === 'COMPLETED' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-gray-300 mt-0.5" />
                                    )}

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm">{goal.title}</p>
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1 items-center">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{goal.goal_type}</span>
                                                    {goal.target_date && (
                                                        <div className="flex items-center gap-1 ml-1 text-gray-500">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>Due: {formatDate(goal.target_date)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <GoalModal 
                                                planId={planId} 
                                                goal={goal} 
                                                onSaved={fetchGoals}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: Timeline (Macrocycles) */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Season Timeline</CardTitle>
                    <MacrocycleModal 
                        planId={plan.id} 
                        onSaved={fetchPlan} 
                        defaultStartDate={defaultStart}
                        defaultEndDate={defaultEnd}
                    />
                </CardHeader>
                <CardContent>
                    {sortedCycles.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                            No phases defined yet. Click "Add Phase" to build your timeline.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedCycles.map((cycle) => (
                                <div key={cycle.id} className="flex flex-col p-4 border rounded-lg bg-white hover:border-brand-blue transition-colors gap-3">
                                    
                                    {/* Phase Header */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-lg">{cycle.phase_title}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{cycle.phase_start} to {cycle.phase_end}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <MacrocycleModal 
                                                planId={plan.id} 
                                                macrocycle={cycle} 
                                                onSaved={fetchPlan} 
                                                trigger={<Button variant="outline" size="sm">Edit</Button>} 
                                            />
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteMacrocycle(cycle.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Primary Focus */}
                                    {cycle.phase_focus && (
                                        <div className="bg-slate-100 p-2 rounded text-sm font-medium text-slate-800">
                                            {cycle.phase_focus}
                                        </div>
                                    )}

                                    {/* 4 Pillars Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                        {cycle.technical_focus && (
                                            <div className="text-xs p-2 bg-blue-50 rounded border border-blue-100">
                                                <div className="flex items-center gap-1 font-bold text-blue-700 mb-1"><Zap className="h-3 w-3" /> Tech</div>
                                                {cycle.technical_focus}
                                            </div>
                                        )}
                                        {cycle.component_focus && (
                                            <div className="text-xs p-2 bg-pink-50 rounded border border-pink-100">
                                                <div className="flex items-center gap-1 font-bold text-pink-700 mb-1"><Palette className="h-3 w-3" /> Comp</div>
                                                {cycle.component_focus}
                                            </div>
                                        )}
                                        {cycle.physical_focus && (
                                            <div className="text-xs p-2 bg-orange-50 rounded border border-orange-100">
                                                <div className="flex items-center gap-1 font-bold text-orange-700 mb-1"><Dumbbell className="h-3 w-3" /> Phys</div>
                                                {cycle.physical_focus}
                                            </div>
                                        )}
                                        {cycle.mental_focus && (
                                            <div className="text-xs p-2 bg-purple-50 rounded border border-purple-100">
                                                <div className="flex items-center gap-1 font-bold text-purple-700 mb-1"><Brain className="h-3 w-3" /> Ment</div>
                                                {cycle.mental_focus}
                                            </div>
                                        )}
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