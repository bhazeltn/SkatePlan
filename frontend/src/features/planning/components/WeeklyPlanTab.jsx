import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Pencil } from 'lucide-react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { UnifiedDayCard } from './UnifiedDayCard';
import { WeeklyEditModal } from './WeeklyEditModal';

export function WeeklyPlanTab({ skater, team, isSynchro, readOnly }) { // <--- Added readOnly
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [currentMonday, setCurrentMonday] = useState(
      startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0]
  );

  const [plans, setPlans] = useState([]); 
  const [isEditing, setIsEditing] = useState(false);

  const fetchWeek = async (dateStr) => {
      setLoading(true);
      try {
          let url = '';
          if (isSynchro && team) {
               url = `/synchro/${team.id}/week-view/?date=${dateStr}`;
          } else if (team) {
               url = `/teams/${team.id}/week-view/?date=${dateStr}`;
          } else if (skater) {
               url = `/skaters/${skater.id}/week-view/?date=${dateStr}`;
          } else {
               console.error("WeeklyPlanTab: No context provided");
               setLoading(false);
               return;
          }

          const data = await apiRequest(url, 'GET', null, token);
          setPlans(data.plans || []);
      } catch (e) { 
          console.error(e); 
      } finally { 
          setLoading(false); 
      }
  };

  useEffect(() => {
      fetchWeek(currentMonday);
  }, [skater, team, isSynchro, currentMonday, token]);

  const changeWeek = (days) => {
      const newDate = addDays(parseISO(currentMonday), days);
      setCurrentMonday(newDate.toISOString().split('T')[0]);
  };

  if (loading) return <div className="p-8 text-center">Loading schedule...</div>;

  return (
    <div className="space-y-6">
      
      {/* Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => changeWeek(-7)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-center min-w-[160px]">
                <h3 className="text-lg font-bold text-gray-900">
                    {format(parseISO(currentMonday), 'MMM d')} - {format(addDays(parseISO(currentMonday), 6), 'MMM d')}
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {format(parseISO(currentMonday), 'yyyy')}
                </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => changeWeek(7)}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="flex gap-2">
            {/* Hide Edit Button if Read Only */}
            {!readOnly && (
                <Button onClick={() => setIsEditing(true)} disabled={plans.length === 0}>
                    <Pencil className="h-4 w-4 mr-2" /> 
                    Manage Weekly Plan
                </Button>
            )}
        </div>
      </div>

      {/* Grid View */}
      {plans.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
              No active plans found for this week. Check Yearly Plan dates.
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const dateStr = addDays(parseISO(currentMonday), dayIdx).toISOString().split('T')[0];
                  
                  const dayPlans = plans.map(p => ({
                      label: p.label,
                      data: p.plan_data.session_breakdown?.[dayIdx] || {}
                  }));

                  return (
                      <UnifiedDayCard 
                          key={dayIdx} 
                          date={dateStr} 
                          plans={dayPlans} 
                      />
                  );
              })}
          </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
          <WeeklyEditModal 
              open={isEditing} 
              onClose={() => setIsEditing(false)}
              plans={plans}
              weekStart={currentMonday}
              onSaved={() => fetchWeek(currentMonday)}
          />
      )}
    </div>
  );
}