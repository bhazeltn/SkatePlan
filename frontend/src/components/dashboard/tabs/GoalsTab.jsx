import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalModal } from '@/components/planning/GoalModal';
import { CheckCircle2, Circle, Calendar, Target } from 'lucide-react';

export function GoalsTab({ skater }) {
  const { token } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/goals/`, 'GET', null, token);
      setGoals(data || []);
    } catch (err) {
      console.error("Failed to load goals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater) fetchGoals();
  }, [skater, token]);

  const activeGoals = goals.filter(g => g.current_status !== 'COMPLETED' && g.current_status !== 'ARCHIVED');
  const completedGoals = goals.filter(g => g.current_status === 'COMPLETED');

  if (loading) return <div className="p-8 text-center">Loading goals...</div>;

  return (
    <div className="space-y-8">
      
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Goals</h3>
            <p className="text-sm text-muted-foreground">Track objectives across all timeframes</p>
        </div>
        <GoalModal 
            skaterId={skater.id} 
            onSaved={fetchGoals} 
            trigger={<Button>Add New Goal</Button>}
        />
      </div>

      {/* Active Goals Grid */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Active</h4>
        {activeGoals.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">No active goals.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onUpdate={fetchGoals} />
                ))}
            </div>
        )}
      </div>

      {/* History Grid */}
      {completedGoals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Completed</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                {completedGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onUpdate={fetchGoals} />
                ))}
            </div>
          </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onUpdate }) {
    // Helper for date
    const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <GoalModal 
            goal={goal} 
            onSaved={onUpdate}
            trigger={
                <Card className="cursor-pointer hover:border-brand-blue hover:shadow-sm transition-all group h-full">
                    <CardContent className="p-5 flex items-start gap-4">
                        {goal.current_status === 'COMPLETED' ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5" />
                        ) : (
                            <Target className="h-6 w-6 text-brand-blue mt-0.5" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{goal.title}</h4>
                            
                            <div className="flex flex-wrap gap-2 text-xs mt-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border font-medium">
                                    {goal.goal_timeframe}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
                                    {goal.goal_type}
                                </span>
                            </div>

                            {goal.target_date && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                                    <Calendar className="h-3 w-3" />
                                    <span>Due: {formatDate(goal.target_date)}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            }
        />
    );
}