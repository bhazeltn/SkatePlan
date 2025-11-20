import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogSessionModal } from '@/components/dashboard/LogSessionModal';
import { Calendar, User, Activity, Star } from 'lucide-react';

export function LogsTab({ skater }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/logs/`, 'GET', null, token);
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater) fetchLogs();
  }, [skater, token]);

  if (loading) return <div className="p-8 text-center">Loading history...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Training Logs</h3>
            <p className="text-sm text-muted-foreground">History of all sessions</p>
        </div>
        <LogSessionModal skater={skater} onLogCreated={fetchLogs} />
      </div>

      {/* Logs List */}
      <div className="space-y-4">
          {logs.length === 0 ? (
             <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                No logs recorded yet.
             </div>
          ) : (
             logs.map((log) => (
                 <Card key={log.id} className="hover:border-brand-blue transition-colors">
                     <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            
                            {/* Meta Info (Stars & Date) */}
                            <div className="min-w-[200px] space-y-2">
                                <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <Calendar className="h-4 w-4 text-brand-blue" />
                                    {new Date(log.session_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                                
                                <div className="flex gap-0.5" title="Session Quality">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                            key={star}
                                            className={`h-4 w-4 ${star <= (log.session_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} 
                                        />
                                    ))}
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{log.discipline_name}</span>
                                </div>
                            </div>

                            {/* Wellbeing Panel */}
                            <div className="min-w-[180px] p-2 bg-slate-50 rounded border text-sm flex flex-col gap-2">
                                
                                {/* Energy Row */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Energy</span>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <Zap 
                                                key={val}
                                                className={`h-3 w-3 ${val <= (log.energy_stamina || 0) ? 'fill-blue-400 text-blue-400' : 'text-gray-300'}`} 
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Mood Row */}
                                <div className="flex items-center gap-2 border-t border-slate-200 pt-2 mt-1">
                                    <span className="text-xl">{log.sentiment_emoji || "🙂"}</span>
                                    <span className="text-xs text-gray-600 italic leading-tight">
                                        {log.wellbeing_mental_focus_notes || "No focus notes"}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="flex-1 text-sm text-gray-700 border-l pl-4">
                                <span className="font-semibold text-gray-900 block mb-1">Notes:</span>
                                <p className="whitespace-pre-wrap text-slate-600">{log.coach_notes || "No notes."}</p>
                            </div>
                            
                        </div>
                     </CardContent>
                 </Card>
             ))
          )}
      </div>

    </div>
  );
}