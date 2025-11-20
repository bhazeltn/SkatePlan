import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogResultModal } from '@/components/dashboard/LogResultModal';
import { Trophy, MapPin, Calendar, Clock, Edit2 } from 'lucide-react'; // Added Clock, Edit2

export function CompetitionsTab({ skater }) {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/results/`, 'GET', null, token);
      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (skater) fetchResults(); }, [skater, token]);

  // --- SPLIT DATA ---
  const history = results.filter(r => r.status === 'COMPLETED');
  const upcoming = results.filter(r => r.status !== 'COMPLETED');

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Competitions</h3>
            <p className="text-sm text-muted-foreground">Calendar and Results</p>
        </div>
        <LogResultModal skater={skater} onSaved={fetchResults} />
      </div>

      {/* --- UPCOMING EVENTS --- */}
      <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming Events</h4>
          {upcoming.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No upcoming competitions planned.</p>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(event => (
                   <Card key={event.id} className="border-l-4 border-l-blue-500">
                       <CardContent className="p-4 flex justify-between items-start">
                           <div>
                               <h4 className="font-bold text-gray-900">{event.competition.title}</h4>
                               <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                   <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.competition.start_date}</div>
                                   <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.competition.city}</div>
                               </div>
                               <div className="mt-2 inline-flex items-center gap-2">
                                   <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">{event.status}</span>
                                   <span className="text-xs text-gray-600">{event.level}</span>
                               </div>
                           </div>
                           {/* Edit Trigger to change status to Completed */}
                           <LogResultModal 
                               skater={skater} 
                               resultToEdit={event} 
                               onSaved={fetchResults} 
                               trigger={<Button variant="outline" size="sm">Update</Button>} 
                           />
                       </CardContent>
                   </Card>
                ))}
             </div>
          )}
      </div>

      {/* --- RESULTS HISTORY (Existing Code) --- */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Results History</h4>
        {history.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">No results recorded.</div>
        ) : (
            <div className="space-y-4">
                {history.map((res) => (
                    <div key={res.id} className="flex items-start gap-4 p-4 border rounded-lg hover:border-brand-blue transition-colors bg-white">
                        <div className="bg-yellow-50 p-3 rounded-full"><Trophy className="h-6 w-6 text-yellow-600" /></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg text-gray-900">{res.competition.title}</h4>
                                <div className="text-right">
                                    <span className="block font-bold text-xl text-brand-blue">{res.total_score || "--"}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
                                </div>
                            </div>
                            {/* (Render the rest of the card same as before: Location, Table, Notes) */}
                            {/* ... Copied from previous step ... */}
                            <div className="flex gap-4 text-sm text-gray-600 mt-1 mb-3">
                                <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {res.competition.city}, {res.competition.province_state}</div>
                                <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {res.competition.start_date}</div>
                                <span className="font-medium text-gray-900 border-l pl-3 ml-1">{res.level} • Place: {res.placement || "-"}</span>
                            </div>
                            {res.segment_scores && res.segment_scores.length > 0 && (
                                <div className="mt-3 border rounded-md overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-xs text-gray-500 uppercase">
                                            <tr><th className="px-3 py-2">Segment</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right text-gray-400">TES</th><th className="px-3 py-2 text-right text-gray-400">PCS</th><th className="px-3 py-2 text-right text-red-400">Ded</th><th className="px-3 py-2 text-right text-green-500">Bon</th><th className="px-3 py-2 text-right">Place</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {res.segment_scores.map((seg, i) => (
                                                <tr key={i} className="bg-white">
                                                    <td className="px-3 py-2 font-medium">{seg.name}</td>
                                                    <td className="px-3 py-2 text-right font-bold">{seg.score}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500">{seg.tes}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500">{seg.pcs}</td>
                                                    <td className="px-3 py-2 text-right text-red-500">{seg.deductions}</td>
                                                    <td className="px-3 py-2 text-right text-green-600">{seg.bonus}</td>
                                                    <td className="px-3 py-2 text-right">{seg.placement}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}