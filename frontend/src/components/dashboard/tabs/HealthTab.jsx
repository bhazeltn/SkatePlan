import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InjuryModal } from '@/components/dashboard/InjuryModal';
import { AlertTriangle, CheckCircle2, Activity, Calendar } from 'lucide-react';

export function HealthTab({ skater }) {
  const { token } = useAuth();
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInjuries = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/injuries/`, 'GET', null, token);
      setInjuries(data || []);
    } catch (err) {
      console.error("Failed to load injuries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater) fetchInjuries();
  }, [skater, token]);

  // Group by status
  const activeInjuries = injuries.filter(i => i.recovery_status !== 'Resolved');
  const history = injuries.filter(i => i.recovery_status === 'Resolved');

  if (loading) return <div className="p-8 text-center">Loading health records...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Health & Injuries</h3>
            <p className="text-sm text-muted-foreground">Track recovery and return-to-sport status</p>
        </div>
        <InjuryModal 
            skater={skater} 
            onSaved={fetchInjuries} 
            trigger={
                <Button variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report New Injury
                </Button>
            }
        />
      </div>

      {/* Active Issues Card (Red Flag) */}
      <Card className={activeInjuries.length > 0 ? "border-red-200 bg-red-50/30" : ""}>
        <CardHeader>
            <CardTitle className={activeInjuries.length > 0 ? "text-red-700" : ""}>
                Active Issues
            </CardTitle>
        </CardHeader>
        <CardContent>
            {activeInjuries.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed rounded-lg text-muted-foreground bg-white">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p>No active injuries reported.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeInjuries.map(injury => (
                        <InjuryItem key={injury.id} injury={injury} onUpdate={fetchInjuries} />
                    ))}
                </div>
            )}
        </CardContent>
      </Card>

      {/* History Card */}
      {history.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="text-gray-500">History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 opacity-70">
                    {history.map(injury => (
                        <InjuryItem key={injury.id} injury={injury} onUpdate={fetchInjuries} />
                    ))}
                </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

function InjuryItem({ injury, onUpdate }) {
    // Helper to format date
    const formatDate = (d) => new Date(d).toLocaleDateString();

    return (
        <div className="flex items-start gap-3 p-4 border rounded-md bg-white hover:border-brand-blue transition-colors group">
            {/* Status Icon */}
            {injury.recovery_status === 'Active' ? (
                <div className="bg-red-100 p-2 rounded-full">
                    <Activity className="h-5 w-5 text-red-600" />
                </div>
            ) : injury.recovery_status === 'Recovering' ? (
                <div className="bg-amber-100 p-2 rounded-full">
                    <Activity className="h-5 w-5 text-amber-600" />
                </div>
            ) : (
                <div className="bg-slate-100 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-slate-500" />
                </div>
            )}
            
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-gray-900">{injury.injury_type}</h4>
                        
                        {/* Meta Row */}
                        <div className="flex flex-wrap gap-2 text-xs mt-1 items-center">
                            <span className="font-medium text-gray-600">
                                {injury.body_area && injury.body_area.length > 0 ? injury.body_area.join(", ") : "General"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>Onset: {formatDate(injury.date_of_onset)}</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                                injury.severity === 'Severe' || injury.severity === 'Critical' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                                {injury.severity}
                            </span>
                        </div>

                        {/* Notes */}
                        {injury.recovery_notes && (
                            <p className="text-sm text-gray-700 mt-2 bg-slate-50 p-2 rounded border-l-2 border-slate-300">
                                {injury.recovery_notes}
                            </p>
                        )}
                    </div>
                    
                    {/* Edit Trigger */}
                    <InjuryModal 
                        injury={injury} 
                        onSaved={onUpdate}
                        trigger={
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-xs">
                                Update Status
                            </Button>
                        }
                    />
                </div>
            </div>
        </div>
    )
}