import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateYearlyPlanModal } from '../CreateYearlyPlanModal';
import { Calendar, Trophy, ArrowRight } from 'lucide-react';

export function YearlyPlansTab({ skater }) {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/ytps/`, 'GET', null, token);
      setPlans(data || []);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater) fetchPlans();
  }, [skater, token]);

  if (loading) return <div className="p-8 text-center">Loading plans...</div>;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Season Plans</h3>
            <p className="text-sm text-muted-foreground">Manage YTPs and Macrocycles</p>
        </div>
        <CreateYearlyPlanModal skater={skater} onPlanCreated={fetchPlans} />
      </div>

      {/* Plan List */}
      {plans.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No plans created for this season yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:border-brand-blue transition-all cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold text-brand-blue">
                    {plan.discipline_name}
                </CardTitle>
                {/* This button will eventually link to the Editor Page */}
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-brand-orange" />
                        <span className="font-medium">Goal:</span>
                        <span className="text-gray-600">{plan.primary_season_goal}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Structure:</span>
                        <span className="text-gray-600">{plan.peak_type}</span>
                    </div>
                    
                    {/* Mini Timeline Visualization (Placeholder) */}
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                            {plan.macrocycles?.length || 0} Macrocycles defined
                        </p>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            {/* This visually represents the phases */}
                            {plan.macrocycles && plan.macrocycles.length > 0 ? (
                                plan.macrocycles.map((cycle, i) => (
                                    <div 
                                        key={cycle.id} 
                                        className={`h-full ${i % 2 === 0 ? 'bg-blue-200' : 'bg-blue-300'}`} 
                                        style={{ width: `${100 / plan.macrocycles.length}%` }}
                                    />
                                ))
                            ) : (
                                <div className="h-full w-full bg-gray-200"></div>
                            )}
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}