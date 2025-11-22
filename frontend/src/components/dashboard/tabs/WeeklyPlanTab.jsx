import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Calendar, Save, Layers } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns';
import { DayPlanner } from '@/components/planning/DayPlanner';

export function WeeklyPlanTab({ skater, team }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Date State (Always tracking the Monday of the view)
  const [currentMonday, setCurrentMonday] = useState(
      startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0]
  );

  // Data State
  const [plans, setPlans] = useState([]); // Array of { label, plan_data }

  const fetchWeek = async (dateStr) => {
      setLoading(true);
      try {
          // --- DYNAMIC URL SWITCHING ---
          const url = team 
            ? `/teams/${team.id}/week-view/?date=${dateStr}`
            : `/skaters/${skater.id}/week-view/?date=${dateStr}`;
          // -----------------------------

          const data = await apiRequest(url, 'GET', null, token);
          setPlans(data.plans || []);
      } catch (e) { 
          console.error("Failed to load week", e); 
      } finally { 
          setLoading(false); 
      }
  };

  useEffect(() => {
      if (skater || team) fetchWeek(currentMonday);
  }, [skater, team, currentMonday, token]);

  // --- NAVIGATION ---
  const changeWeek = (days) => {
      const newDate = days > 0 
        ? addDays(parseISO(currentMonday), days) 
        : subDays(parseISO(currentMonday), Math.abs(days));
      
      setCurrentMonday(newDate.toISOString().split('T')[0]);
  };

  // --- SAVE HANDLER ---
  const handleSave = async () => {
      try {
          // Save all plans in parallel
          await Promise.all(plans.map(p => {
              return apiRequest(`/weeks/${p.plan_data.id}/`, 'PATCH', {
                  theme: p.plan_data.theme,
                  session_breakdown: p.plan_data.session_breakdown
              }, token);
          }));
          alert("Plans saved!");
      } catch (e) { 
          alert("Failed to save."); 
      }
  };

  // Helper to update local state for a specific plan
  const updatePlanState = (planIndex, field, value, dayIndex = null) => {
      const newPlans = [...plans];
      const target = newPlans[planIndex].plan_data;
      
      if (dayIndex !== null) {
          // Update Daily Breakdown
          const schedule = target.session_breakdown || {};
          schedule[dayIndex] = { ...schedule[dayIndex], [field]: value };
          target.session_breakdown = schedule;
      } else {
          // Update Theme
          target[field] = value;
      }
      setPlans(newPlans);
  };

  if (loading) return <div className="p-8 text-center">Loading schedule...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header / Navigator */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        
        <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-blue/10 rounded-full text-brand-blue">
                <Layers className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900">Weekly Schedule</h3>
                <p className="text-xs text-muted-foreground">
                    {plans.length > 0 ? `Viewing ${plans.length} active plans` : 'No active plans for this week'}
                </p>
            </div>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => changeWeek(-7)}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center min-w-[180px]">
                <div className="flex items-center justify-center gap-2 font-bold text-lg">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {format(parseISO(currentMonday), 'MMM d')} - {format(addDays(parseISO(currentMonday), 6), 'MMM d')}
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {format(parseISO(currentMonday), 'yyyy')}
                </p>
            </div>

            <Button variant="outline" size="icon" onClick={() => changeWeek(7)}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        <Button onClick={handleSave} disabled={plans.length === 0}>
            <Save className="h-4 w-4 mr-2" /> Save All
        </Button>
      </div>

      {/* --- PLANS RENDER --- */}
      {plans.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
              No active seasons found for this week. Check your Yearly Plan dates.
          </div>
      ) : (
          <div className="space-y-8">
              {plans.map((planObj, pIdx) => (
                  <div key={planObj.plan_data.id} className="space-y-4">
                      
                      {/* Plan Header Badge */}
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <span className="bg-slate-800 text-white px-3 py-1 rounded text-sm font-bold uppercase tracking-wider">
                              {planObj.label}
                          </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Left: Focus */}
                          <div className="lg:col-span-1">
                              <Card>
                                  <CardHeader><CardTitle>Focus & Context</CardTitle></CardHeader>
                                  <CardContent className="space-y-4">
                                      <div className="space-y-2">
                                          <Label>Weekly Theme</Label>
                                          <Input 
                                              value={planObj.plan_data.theme || ''} 
                                              onChange={(e) => updatePlanState(pIdx, 'theme', e.target.value)}
                                              placeholder="Primary goal..." 
                                          />
                                      </div>
                                      
                                      {/* Macrocycle Context */}
                                      {planObj.plan_data.active_macrocycles?.length > 0 && (
                                          <div className="p-3 bg-blue-50 rounded border border-blue-100">
                                              <span className="text-xs font-bold text-blue-700 uppercase">Current Phase</span>
                                              {planObj.plan_data.active_macrocycles.map((mc, i) => (
                                                  <div key={i} className="mt-1">
                                                      <p className="font-medium text-sm">{mc.phase_title}</p>
                                                      <p className="text-xs text-slate-600">{mc.phase_focus}</p>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </CardContent>
                              </Card>
                          </div>

                          {/* Right: Daily Schedule */}
                          <div className="lg:col-span-2">
                               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                                      <DayPlanner 
                                          key={dayIdx}
                                          dayIndex={dayIdx}
                                          weekStart={currentMonday}
                                          data={planObj.plan_data.session_breakdown?.[dayIdx] || {}}
                                          onChange={(idx, field, val) => updatePlanState(pIdx, null, val, idx)} 
                                      />
                                  ))}
                              </div>
                          </div>

                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}