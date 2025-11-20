import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogResultModal } from '@/components/dashboard/LogResultModal';
import { Trophy, MapPin, Calendar } from 'lucide-react';

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
      console.error("Failed to load results", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skater) fetchResults();
  }, [skater, token]);

  if (loading) return <div className="p-8 text-center">Loading results...</div>;

  return (
    <div className="space-y-6">
      
      {/* Header Action */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Competitions</h3>
            <p className="text-sm text-muted-foreground">Results and Personal Bests</p>
        </div>
        <LogResultModal skater={skater} onSaved={fetchResults} />
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
            <CardTitle>Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
            {results.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                    No competition results recorded.
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((res) => (
                        <div key={res.id} className="flex items-start gap-4 p-4 border rounded-lg hover:border-brand-blue transition-colors bg-white">
                            {/* Trophy Icon */}
                            <div className="bg-yellow-50 p-3 rounded-full">
                                <Trophy className="h-6 w-6 text-yellow-600" />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                {/* Header Row */}
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg text-gray-900">{res.competition.title}</h4>
                                    <div className="text-right">
                                        <span className="block font-bold text-xl text-brand-blue">{res.total_score || "--"}</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
                                    </div>
                                </div>
                                
                                {/* Meta Row */}
                                <div className="flex gap-4 text-sm text-gray-600 mt-1 mb-3">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> 
                                        {res.competition.city}, {res.competition.province_state}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> {res.competition.start_date}
                                    </div>
                                    <span className="font-medium text-gray-900 border-l pl-3 ml-1">
                                        {res.level} • Place: {res.placement || "-"}
                                    </span>
                                </div>

                                {/* --- DETAILED BREAKDOWN TABLE --- */}
                                {/* Only renders if segment_scores exists and has items */}
                                {res.segment_scores && Array.isArray(res.segment_scores) && res.segment_scores.length > 0 && (
                                    <div className="mt-3 border rounded-md overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs text-gray-500 uppercase">
                                                <tr>
                                                    <th className="px-3 py-2 font-semibold">Segment</th>
                                                    <th className="px-3 py-2 text-right font-semibold">Score</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-400">TES</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-gray-400">PCS</th>
                                                    <th className="px-3 py-2 text-right font-semibold">Place</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {res.segment_scores.map((seg, i) => (
                                                    <tr key={i} className="bg-white hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-medium text-gray-900">{seg.name}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-brand-blue">{seg.score}</td>
                                                        <td className="px-3 py-2 text-right text-gray-500">{seg.tes || '-'}</td>
                                                        <td className="px-3 py-2 text-right text-gray-500">{seg.pcs || '-'}</td>
                                                        <td className="px-3 py-2 text-right font-medium text-gray-900">#{seg.placement || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {/* -------------------------------- */}
                                
                                {res.notes && (
                                    <p className="text-sm text-gray-600 mt-3 border-l-2 border-brand-blue/30 pl-3 italic bg-slate-50/50 p-2 rounded-r">
                                        "{res.notes}"
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}