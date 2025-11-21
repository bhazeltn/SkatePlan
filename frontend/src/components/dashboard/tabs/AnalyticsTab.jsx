import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatSnapshot, SingleStatSnapshot } from '@/components/dashboard/StatSnapshot';
import { Trophy, Activity, Award, Zap, Palette, TrendingUp } from 'lucide-react';

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
                
                {/* Placeholder */}
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

        {/* 2. SEGMENT BREAKDOWNS */}
        {data.segments && Object.keys(data.segments).length > 0 && (
            <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Segment Analysis</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(data.segments).map(([segName, stats]) => (
                        <div key={segName} className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider border-b pb-1">{segName}</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <StatSnapshot 
                                    label="Total" 
                                    // Use Optional Chaining (?.) to prevent crashes
                                    pb={stats?.total?.pb} 
                                    sb={stats?.total?.sb} 
                                    icon={Award}
                                    color="text-purple-500"
                                    bg="bg-purple-50"
                                />
                                <StatSnapshot 
                                    label="TES (Tech)" 
                                    pb={stats?.tes?.pb} 
                                    sb={stats?.tes?.sb} 
                                    icon={Zap}
                                    color="text-blue-500"
                                    bg="bg-blue-50"
                                />
                                <StatSnapshot 
                                    label="PCS (Comp)" 
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