import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Calendar, Save } from 'lucide-react';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { DayPlanner } from '@/components/planning/DayPlanner';

export function WeeklyPlanTab({ skater }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  
  // Form State for the active week
  const [theme, setTheme] = useState('');
  const [schedule, setSchedule] = useState({}); // Stores the 7 days of data

  // 1. Fetch Seasons on Load
  useEffect(() => {
    if (skater) {
        const fetchSeasons = async () => {
            try {
                const data = await apiRequest(`/skaters/${skater.id}/seasons/`, 'GET', null, token);
                setSeasons(data || []);
                
                // Default to most recent season
                if (data && data.length > 0) {
                    setSelectedSeasonId(data[data.length - 1].id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchSeasons();
    }
  }, [skater, token]);

  // 2. Fetch Weeks when Season Changes
  useEffect(() => {
    if (selectedSeasonId) {
        const fetchWeeks = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/seasons/${selectedSeasonId}/weeks/`, 'GET', null, token);
                setWeeks(data || []);
                
                // Try to find "Current Week" based on today
                const today = new Date();
                const currentIndex = data.findIndex(w => {
                    const start = parseISO(w.week_start);
                    const end = addDays(start, 6);
                    return isWithinInterval(today, { start, end });
                });

                // If found, select it. If not, select the first week.
                if (currentIndex !== -1) {
                    setSelectedWeekIndex(currentIndex);
                } else {
                    setSelectedWeekIndex(0);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchWeeks();
    }
  }, [selectedSeasonId, token]);

  // 3. Update local form state when selected week changes
  useEffect(() => {
      if (weeks.length > 0 && weeks[selectedWeekIndex]) {
          const week = weeks[selectedWeekIndex];
          setTheme(week.theme || '');
          
          // Load existing schedule or initialize empty structure
          // We assume the backend sends an object (or empty dict) for session_breakdown
          setSchedule(week.session_breakdown || {});
      }
  }, [selectedWeekIndex, weeks]);

  // --- HANDLERS ---

  const handleDayChange = (dayIndex, field, value) => {
      setSchedule(prev => ({
          ...prev,
          [dayIndex]: {
              ...prev[dayIndex],
              [field]: value
          }
      }));
  };

  const handleSave = async () => {
      const week = weeks[selectedWeekIndex];
      try {
          await apiRequest(`/weeks/${week.id}/`, 'PATCH', {
              theme: theme,
              session_breakdown: schedule
          }, token);
          
          // Update local state to reflect change without refetch
          const updatedWeeks = [...weeks];
          updatedWeeks[selectedWeekIndex] = { 
              ...week, 
              theme: theme,
              session_breakdown: schedule
          };
          setWeeks(updatedWeeks);
          
          alert("Week saved!");
      } catch (e) {
          alert("Failed to save week.");
      }
  };

  const navigateWeek = (direction) => {
      const newIndex = selectedWeekIndex + direction;
      if (newIndex >= 0 && newIndex < weeks.length) {
          setSelectedWeekIndex(newIndex);
      }
  };

  // --- RENDER ---

  if (!selectedSeasonId) return <div className="p-8 text-center">No seasons found. Create a plan to start.</div>;
  if (loading) return <div className="p-8 text-center">Loading schedule...</div>;
  if (weeks.length === 0) return <div className="p-8 text-center">No weeks generated for this season. Check dates.</div>;

  const activeWeek = weeks[selectedWeekIndex];
  const weekStart = parseISO(activeWeek.week_start);
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-6">
      
      {/* Header / Navigator */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        
        {/* Season Selector */}
        <div className="flex items-center gap-2">
            <Label className="w-16">Season:</Label>
            <select 
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
            >
                {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.season}</option>
                ))}
            </select>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} disabled={selectedWeekIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center min-w-[180px]">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Week {selectedWeekIndex + 1}</p>
                <div className="flex items-center justify-center gap-2 font-bold text-lg">
                    <Calendar className="h-4 w-4 text-brand-blue" />
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                </div>
            </div>

            <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} disabled={selectedWeekIndex === weeks.length - 1}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>

        {/* Save Action */}
        <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Plan
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Focus & Theme */}
          <div className="lg:col-span-1 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Weekly Focus</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label>Theme / Primary Goal</Label>
                          <Input 
                              value={theme} 
                              onChange={(e) => setTheme(e.target.value)} 
                              placeholder="e.g. Volume & Consistency"
                              className="font-medium"
                          />
                      </div>
                      
                      {/* Macrocycle Context Display */}
                      <div className="p-4 bg-slate-50 rounded-md border">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                            Current Macrocycle Phase
                          </span>
                          
                          {activeWeek.active_macrocycles && activeWeek.active_macrocycles.length > 0 ? (
                              <div className="space-y-3">
                                  {activeWeek.active_macrocycles.map((cycle, idx) => (
                                      <div key={idx} className="border-l-2 border-brand-blue pl-3">
                                          <div className="flex justify-between items-center">
                                              <p className="font-medium text-gray-900">{cycle.phase_title}</p>
                                              <span className="text-xs bg-white border px-2 py-0.5 rounded text-gray-500">
                                                {cycle.discipline}
                                              </span>
                                          </div>
                                          {cycle.phase_focus && (
                                              <p className="text-sm text-gray-600 mt-1">{cycle.phase_focus}</p>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-sm text-gray-400 italic">
                                No active phase defined for this week. 
                                <br/>Check your <a href={`#/plans/${activeWeek.active_macrocycles?.[0]?.plan_id || ''}?tab=yearly`} className="underline hover:text-brand-blue">Yearly Plan</a>.
                              </p>
                          )}
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* Right: Daily Breakdown */}
          <div className="lg:col-span-2">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {/* Render 7 Days (0-6) */}
                  {Array.from({ length: 7 }).map((_, index) => (
                      <DayPlanner 
                          key={index}
                          dayIndex={index}
                          weekStart={activeWeek.week_start}
                          data={schedule[index]}
                          onChange={handleDayChange}
                      />
                  ))}
              </div>
          </div>

      </div>

    </div>
  );
}