import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InjuryModal } from '@/components/dashboard/InjuryModal';
import { HeartPulse, Activity, AlertTriangle } from 'lucide-react';

export function HealthTab({ skater, team, isSynchro, permissions }) {
  const { token } = useAuth();
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);

  let fetchUrl = '';
  if (isSynchro) fetchUrl = `/synchro/${team.id}/injuries/`;
  else if (team) fetchUrl = `/teams/${team.id}/injuries/`;
  else fetchUrl = `/skaters/${skater.id}/injuries/`;

  const fetchInjuries = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(fetchUrl, 'GET', null, token);
      setInjuries(data || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (skater || team) fetchInjuries(); }, [skater, team, token]);

  const activeInjuries = injuries.filter(i => i.recovery_status !== 'Resolved');
  const history = injuries.filter(i => i.recovery_status === 'Resolved');

  if (loading) return <div className="p-8 text-center">Loading health records...</div>;

  return (
    <div className="space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Health & Injuries</h3>
            <p className="text-sm text-muted-foreground">Track recovery and physical status</p>
        </div>
        <InjuryModal 
            skater={skater} 
            team={team} 
            isSynchro={isSynchro}
            onSaved={fetchInjuries} 
            permissions={permissions}
        />
      </div>

      {/* ACTIVE */}
      <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Issues</h4>
          {activeInjuries.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded border border-green-200">
                  <HeartPulse className="h-5 w-5" />
                  <span className="font-medium">No active injuries reported.</span>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeInjuries.map(injury => (
                      <InjuryCard key={injury.id} injury={injury} onUpdate={fetchInjuries} permissions={permissions} skater={skater} />
                  ))}
              </div>
          )}
      </div>

      {/* HISTORY */}
      {history.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Resolved History</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                {history.map(injury => (
                    <InjuryCard key={injury.id} injury={injury} onUpdate={fetchInjuries} permissions={permissions} skater={skater} />
                ))}
            </div>
          </div>
      )}
    </div>
  );
}

function InjuryCard({ injury, onUpdate, permissions, skater }) {
    // Helper for Severity Color
    const getSeverityColor = (sev) => {
        if (sev === 'Severe') return 'text-red-700 bg-red-50 border-red-200';
        if (sev === 'Moderate') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-green-700 bg-green-50 border-green-200';
    };

    return (
        <InjuryModal 
            injuryToEdit={injury} 
            skater={skater}
            onSaved={onUpdate}
            permissions={permissions}
            trigger={
                <Card className={`cursor-pointer hover:shadow-md transition-all ${injury.recovery_status === 'Active' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-900">{injury.injury_type}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-600">{injury.body_area}</span>
                                    {/* SEVERITY BADGE */}
                                    {injury.severity && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${getSeverityColor(injury.severity)}`}>
                                            {injury.severity}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${injury.recovery_status === 'Active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {injury.recovery_status}
                            </span>
                        </div>
                        <div className="mt-3 text-xs text-gray-400 flex gap-4 border-t pt-2">
                            <span>Onset: {injury.date_of_onset}</span>
                            {injury.return_to_sport_date && <span>Return: {injury.return_to_sport_date}</span>}
                        </div>
                    </CardContent>
                </Card>
            }
        />
    );
}