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
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (skater) fetchInjuries(); }, [skater, token]);

  const activeInjuries = injuries.filter(i => i.recovery_status !== 'Resolved');
  const history = injuries.filter(i => i.recovery_status === 'Resolved');

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Health & Injuries</h3>
            <p className="text-sm text-muted-foreground">Track recovery status</p>
        </div>
        <InjuryModal skater={skater} onSaved={fetchInjuries} 
            trigger={<Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" /> Report New Injury</Button>}
        />
      </div>

      {/* Active Issues */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Issues</h4>
        {activeInjuries.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-lg text-green-700">
                <CheckCircle2 className="h-5 w-5" /> No active injuries reported.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeInjuries.map(injury => (
                    <InjuryCard key={injury.id} injury={injury} onUpdate={fetchInjuries} />
                ))}
            </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">History</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
                {history.map(injury => (
                    <InjuryCard key={injury.id} injury={injury} onUpdate={fetchInjuries} />
                ))}
            </div>
          </div>
      )}
    </div>
  );
}

function InjuryCard({ injury, onUpdate }) {
    return (
        <InjuryModal 
            injury={injury} 
            onSaved={onUpdate}
            trigger={
                <Card className="cursor-pointer hover:shadow-md hover:border-brand-blue transition-all h-full">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className={`p-2 rounded-full ${injury.recovery_status === 'Resolved' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600'}`}>
                            <Activity className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{injury.injury_type}</h4>
                            <div className="flex flex-wrap gap-2 text-xs mt-1 items-center">
                                <span className="font-medium text-gray-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {injury.body_area && injury.body_area.length > 0 ? injury.body_area.join(", ") : "General"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded font-medium ${injury.severity.includes('Severe') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {injury.severity}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Onset: {new Date(injury.date_of_onset).toLocaleDateString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            }
        />
    );
}