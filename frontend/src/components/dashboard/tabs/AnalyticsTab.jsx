import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatSnapshot, SingleStatSnapshot } from '@/components/dashboard/StatSnapshot';
import { Trophy, Activity, Award, Zap, Palette, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Legend } from 'recharts';

export function AnalyticsTab({ skater, team, isSynchro }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- DYNAMIC ENDPOINT ---
  let fetchUrl = '';
  if (isSynchro) {
      fetchUrl = `/synchro/${team.id}/stats/`;
  } else if (team) {
      fetchUrl = `/teams/${team.id}/stats/`;
  } else if (skater) {
      fetchUrl = `/skaters/${skater.id}/stats/`;
  }
  // ------------------------

  useEffect(() => {
    if (fetchUrl) {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const result = await apiRequest(fetchUrl, 'GET', null, token);
                setData(result);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }
  }, [fetchUrl, token]);

  if (loading) return <div className="p-8 text-center">Loading analytics...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No data available. Log results to see stats.</div>;

  // ... (Rest of render logic remains the same) ...
  return (
    <div className="space-y-8">
        
        {/* 1. KPI ROW */}
        <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Performance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-2">
                    <StatSnapshot 
                        label="Total Competition Score" 
                        pb={data.overall?.pb} 
                        sb={data.overall?.sb} 
                        icon={Trophy}
                        color="text-yellow-600"
                        bg="bg-yellow-50"
                    />
                </div>
                <SingleStatSnapshot 
                    label="Training Volume"
                    value={data.volume}
                    subtext={`Sessions in ${data.season_name}`}
                    icon={Activity}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <SingleStatSnapshot 
                    label="Goals Achieved"
                    value="--"
                    subtext="Coming Phase 5"
                    icon={TrendingUp}
                    color="text-green-600"
                    bg="bg-green-50"
                />
            </div>
        </div>

        {/* 2. CHARTS ROW */}
        {data.history && data.history.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Score Progression</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})} fontSize={12} />
                                <YAxis domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} formatter={(value) => [value, "Score"]} />
                                <Line type="monotone" dataKey="total_score" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Technical Efficiency</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short'})} fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="planned_bv" name="Planned BV" fill="#E2E8F0" barSize={20} />
                                <Line type="monotone" dataKey="tes" name="Actual TES" stroke="#3B82F6" strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* 3. SEGMENT BREAKDOWNS */}
        {data.segments && Object.keys(data.segments).length > 0 && (
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Segment Analysis</h3>
                <div className="space-y-8">
                    {Object.entries(data.segments).map(([segName, stats]) => (
                        <div key={segName} className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <Award className="h-5 w-5 text-brand-blue" />
                                <h4 className="font-bold text-gray-800 uppercase tracking-wider">{segName}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatSnapshot label="Total" pb={stats?.total?.pb} sb={stats?.total?.sb} icon={Trophy} color="text-purple-500" bg="bg-purple-50" />
                                <StatSnapshot label="TES (Tech)" pb={stats?.tes?.pb} sb={stats?.tes?.sb} icon={Zap} color="text-blue-500" bg="bg-blue-50" />
                                <StatSnapshot label="PCS (Comp)" pb={stats?.pcs?.pb} sb={stats?.pcs?.sb} icon={Palette} color="text-pink-500" bg="bg-pink-50" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}