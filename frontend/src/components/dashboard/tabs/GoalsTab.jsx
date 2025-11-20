import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalModal } from '@/components/planning/GoalModal';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';

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

  // Helper to group goals
  const activeGoals = goals.filter(g => g.current_status !== 'COMPLETED' && g.current_status !== 'ARCHIVED');
  const completedGoals = goals.filter(g => g.current_status === 'COMPLETED');

  if (loading) return <div className="p-8 text-center">Loading goals...</div>;

  return (
    <div className="space-y-6">
      
      {/* --- ACTION HEADER (Matches Yearly Plans Tab) --- */}
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
      {/* ---------------------------------------------- */}

      {/* Active Goals Card */}
      <Card>
        <CardHeader>
            <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
            {activeGoals.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No active goals.</p>
                    <p className="text-xs text-gray-400 mt-1">Create a goal to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {activeGoals.map(goal => (
                        <GoalItem key={goal.id} goal={goal} onUpdate={fetchGoals} />
                    ))}
                </div>
            )}
        </CardContent>
      </Card>

      {/* History Card */}
      {completedGoals.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="text-gray-500">History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 opacity-70">
                    {completedGoals.map(goal => (
                        <GoalItem key={goal.id} goal={goal} onUpdate={fetchGoals} />
                    ))}
                </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

function GoalItem({ goal, onUpdate }) {
    const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return (
        <div className="flex items-start gap-3 p-3 border rounded-md bg-white hover:border-brand-blue transition-colors group">
            {goal.current_status === 'COMPLETED' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
                <Circle className="h-5 w-5 text-gray-300 mt-0.5" />
            )}
            
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-medium text-sm">{goal.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded">{goal.goal_timeframe}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded">{goal.goal_type}</span>
                        </div>
                        {goal.target_date && (
                                <div className="flex items-center gap-1 ml-1 text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>Due: {formatDate(goal.target_date)}</span>
                                </div>
                            )}
                        {/* Optional: Show description snippet if desired */}
                        {/* <p className="text-xs text-gray-500 mt-1 line-clamp-1">{goal.smart_description}</p> */}
                    </div>
                    
                    {/* Edit Trigger */}
                    <GoalModal 
                        goal={goal} 
                        onSaved={onUpdate}
                        trigger={
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 text-xs">Edit</Button>
                        }
                    />
                </div>
            </div>
        </div>
    )
}