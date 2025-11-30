import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateYearlyPlanModal } from './CreateYearlyPlanModal';
import { EditSeasonModal } from './EditSeasonModal';
import { Calendar, Trophy, ArrowRight, Pencil } from 'lucide-react';

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

export function YearlyPlansTab({ skater, team, isSynchro, readOnly, permissions }) { 
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PERMISSIONS ---
  const isCollaborator = skater?.access_level === 'COLLABORATOR'; 
  const canCreate = !readOnly && !isCollaborator;
  // -------------------

  let fetchUrl = '';
  if (isSynchro) fetchUrl = `/synchro/${team.id}/ytps/`;
  else if (team) fetchUrl = `/teams/${team.id}/ytps/`;
  else fetchUrl = `/skaters/${skater.id}/ytps/`;

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(fetchUrl, 'GET', null, token);
      setPlans(data || []);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater || team) fetchPlans();
  }, [skater, team, token]);

  if (loading) return <div className="p-8 text-center">Loading plans...</div>;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Season Plans</h3>
            <p className="text-sm text-muted-foreground">Manage YTPs and Macrocycles</p>
        </div>
        
        {canCreate && (
            <CreateYearlyPlanModal 
              skater={skater} 
              team={team} 
              isSynchro={isSynchro}
              onPlanCreated={fetchPlans} 
          />
        )}
      </div>

      {/* Plan List */}
      {plans.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No plans created for this season yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => {
            // Extract the season object
            const activeSeason = plan.season_info && plan.season_info.length > 0 ? plan.season_info[0] : null;

            return (
                <Card 
                    key={plan.id} 
                    className="hover:border-brand-blue transition-all cursor-pointer group relative"
                    onClick={() => window.location.hash = `#/plans/${plan.id}`}
                >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-xl font-bold text-brand-blue">
                            {plan.discipline_name}
                        </CardTitle>
                        
                        {activeSeason && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-medium">
                                <span>
                                    {activeSeason.season} 
                                    {activeSeason.start_date && (
                                        <span className="ml-1 font-normal text-gray-400">
                                            ({formatDate(activeSeason.start_date)} - {formatDate(activeSeason.end_date)})
                                        </span>
                                    )}
                                </span>
                                
                                {/* FIX: Inline Pencil Button */}
                                {!readOnly && activeSeason.id && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <EditSeasonModal 
                                            season={activeSeason} 
                                            onUpdated={fetchPlans} 
                                            trigger={
                                                <button className="p-1 hover:bg-slate-100 rounded-full text-gray-400 hover:text-brand-blue transition-colors">
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                        
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                                {plan.macrocycles?.length || 0} Macrocycles defined
                            </p>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
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
            );
          })}
        </div>
      )}
    </div>
  );
}