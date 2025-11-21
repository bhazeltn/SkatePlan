import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatSnapshot, SingleStatSnapshot } from '@/components/dashboard/StatSnapshot';
import { Trophy, Activity, Award, Zap, Palette, TrendingUp } from 'lucide-react';
// --- CHART IMPORTS ---
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    ComposedChart, Bar, Legend 
} from 'recharts';

export function AnalyticsTab({ skater }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skater) {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const result = await apiRequest(`/skaters/${skater.id}/stats/`, 'GET', null, token);
                setData(result);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }
  }, [skater, token]);

  if (loading) return <div className="p-8 text-center">Loading analytics...</div>;
  if (!data) return <div className="p-8 text-center">No data available.</div>;

  return (
    <div className="space-y-8">
        
        {/* 1. KPI ROW */}
        <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Performance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Score PB/SB */}
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

                {/* Training Volume */}
                <SingleStatSnapshot 
                    label="Training Volume"
                    value={data.volume}
                    subtext={`Sessions in ${data.season_name}`}
                    icon={Activity}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                
                {/* Goal Completion (Placeholder) */}
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
                
                {/* A. TOTAL SCORE TREND */}
                <Card>
                    <CardHeader><CardTitle>Score Progression</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})} 
                                    fontSize={12}
                                />
                                <YAxis domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip 
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    formatter={(value) => [value, "Score"]}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="total_score" 
                                    stroke="#F59E0B" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: "#F59E0B" }} 
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* B. TECHNICAL EFFICIENCY (BV vs TES) */}
                <Card>
                    <CardHeader><CardTitle>Technical Efficiency</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short'})} 
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} />
                                <Tooltip 
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                
                                {/* Planned BV (Target) */}
                                <Bar dataKey="planned_bv" name="Planned BV" fill="#E2E8F0" barSize={20} />
                                
                                {/* Actual TES (Result) */}
                                <Line type="monotone" dataKey="tes" name="Actual TES" stroke="#3B82F6" strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* 3. SEGMENT BREAKDOWNS (Full Rows) */}
        {data.segments && Object.keys(data.segments).length > 0 && (
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Segment Analysis</h3>
                
                {/* CHANGED: Vertical Stack instead of Grid */}
                <div className="space-y-8">
                    {Object.entries(data.segments).map(([segName, stats]) => (
                        <div key={segName} className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <Award className="h-5 w-5 text-brand-blue" />
                                <h4 className="font-bold text-gray-800 uppercase tracking-wider">{segName}</h4>
                            </div>
                            
                            {/* 3 Cards Across */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatSnapshot 
                                    label="Total Segment Score" 
                                    pb={stats?.total?.pb} 
                                    sb={stats?.total?.sb} 
                                    icon={Trophy}
                                    color="text-purple-500"
                                    bg="bg-purple-50"
                                />
                                <StatSnapshot 
                                    label="Technical (TES)" 
                                    pb={stats?.tes?.pb} 
                                    sb={stats?.tes?.sb} 
                                    icon={Zap}
                                    color="text-blue-500"
                                    bg="bg-blue-50"
                                />
                                <StatSnapshot 
                                    label="Components (PCS)" 
                                    pb={stats?.pcs?.pb} 
                                    sb={stats?.pcs?.sb} 
                                    icon={Palette}
                                    color="text-pink-500"
                                    bg="bg-pink-50"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}