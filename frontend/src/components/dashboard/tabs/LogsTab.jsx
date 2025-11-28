import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogSessionModal } from '@/components/dashboard/LogSessionModal';
import { Activity, Clock, User } from 'lucide-react';

export function LogsTab({ skater, team, isSynchro, permissions }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  let fetchUrl = '';
  if (isSynchro) fetchUrl = `/synchro/${team.id}/logs/`;
  else if (team) fetchUrl = `/teams/${team.id}/logs/`;
  else fetchUrl = `/skaters/${skater.id}/logs/`;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(fetchUrl, 'GET', null, token);
      setLogs(data || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (skater || team) fetchLogs(); }, [skater, team, token]);

  const canCreate = permissions?.canEditLogs;

  if (loading) return <div className="p-8 text-center">Loading logs...</div>;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Training Logs</h3>
            <p className="text-sm text-muted-foreground">Session ratings and notes</p>
        </div>
        {canCreate && (
            <LogSessionModal 
                skater={skater} 
                team={team} 
                isSynchro={isSynchro}
                onLogCreated={fetchLogs} 
                permissions={permissions}
            />
        )}
      </div>

      {logs.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
              No sessions logged yet.
          </div>
      ) : (
          <div className="space-y-4">
              {logs.map(log => (
                  <LogSessionModal 
                      key={log.id}
                      skater={skater}
                      team={team}
                      isSynchro={isSynchro}
                      logToEdit={log}
                      permissions={permissions}
                      onLogCreated={fetchLogs}
                      trigger={
                          <Card className="cursor-pointer hover:border-brand-blue hover:shadow-sm transition-all group">
                              <CardContent className="p-4 flex gap-4">
                                  {/* QUALITY RATING BADGE */}
                                  <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border shrink-0 ${log.session_rating >= 4 ? 'bg-green-50 border-green-200 text-green-700' : log.session_rating <= 2 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                      <span className="text-2xl font-bold mb-0.5">{log.session_rating}</span>
                                      <span className="text-[8px] uppercase font-bold text-center leading-3">Quality<br/>Rating</span>
                                  </div>

                                  {/* CONTENT */}
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                  {new Date(log.session_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{log.discipline_name}</span>
                                              </h4>
                                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Logged by: {log.author_name}</span>
                                                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Energy: {log.energy_stamina}/5</span>
                                                  <span>Mood: {log.sentiment_emoji}</span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      {/* PREVIEW NOTES */}
                                      <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                                          {log.coach_notes ? (
                                              <span className="text-blue-700 font-medium">Coach: {log.coach_notes}</span>
                                          ) : log.skater_notes ? (
                                              <span className="text-green-700 font-medium">Skater: {log.skater_notes}</span>
                                          ) : (
                                              <span className="italic text-gray-400">No notes recorded.</span>
                                          )}
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                      }
                  />
              ))}
          </div>
      )}
    </div>
  );
}