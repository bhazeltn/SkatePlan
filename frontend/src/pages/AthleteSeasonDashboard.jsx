import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, MapPin, ArrowLeft, Settings } from 'lucide-react';

// Tabs
import { WeeklyPlanTab } from '@/components/dashboard/tabs/WeeklyPlanTab';
import { YearlyPlansTab } from '@/components/dashboard/tabs/YearlyPlansTab';
import { GoalsTab } from '@/components/dashboard/tabs/GoalsTab';
import { ProgramsTab } from '@/components/dashboard/tabs/ProgramsTab';
import { CompetitionsTab } from '@/components/dashboard/tabs/CompetitionsTab';
import { TestsTab } from '@/components/dashboard/tabs/TestsTab';
import { LogsTab } from '@/components/dashboard/tabs/LogsTab';
import { HealthTab } from '@/components/dashboard/tabs/HealthTab';
import { AnalyticsTab } from '@/components/dashboard/tabs/AnalyticsTab';
import { ProfileTab } from '@/components/dashboard/tabs/ProfileTab';
import { GapAnalysisTab } from '@/components/dashboard/tabs/GapAnalysisTab'; // <--- Import

export default function AthleteSeasonDashboard() {
  const { id } = useParams();
  const { token } = useAuth();
  const [skater, setSkater] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);

  const fetchSkater = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${id}/`, 'GET', null, token);
      setSkater(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkater();
  }, [id, token]);

  // Helper to format "gap_analysis" -> "Gap Analysis"
  const formatTabLabel = (str) => {
      return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) return <div className="p-8">Loading profile...</div>;
  if (!skater) return <div className="p-8">Skater not found.</div>;

  const tabs = [
      'weekly', 'yearly', 'gap_analysis', 'goals', 'programs', 
      'competitions', 'tests', 'logs', 'health', 'analytics', 'profile'
  ];

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm">
                <User className="h-8 w-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{skater.full_name}</h1>
                <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    {skater.federation && (
                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border">
                            {skater.federation.flag_emoji} {skater.federation.code}
                        </span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {skater.date_of_birth}</span>
                    {skater.home_club && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {skater.home_club}</span>}
                </div>
            </div>
        </div>
        <a href="#/">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Roster</Button>
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {formatTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'weekly' && <WeeklyPlanTab skater={skater} />}
        {activeTab === 'yearly' && <YearlyPlansTab skater={skater} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab skater={skater} />}
        {activeTab === 'goals' && <GoalsTab skater={skater} />}
        {activeTab === 'programs' && <ProgramsTab skater={skater} />}
        {activeTab === 'competitions' && <CompetitionsTab skater={skater} />}
        {activeTab === 'tests' && <TestsTab skater={skater} />}
        {activeTab === 'logs' && <LogsTab skater={skater} />}
        {activeTab === 'health' && <HealthTab skater={skater} />}
        {activeTab === 'analytics' && <AnalyticsTab skater={skater} />}
        {activeTab === 'profile' && <ProfileTab skater={skater} onUpdated={fetchSkater} />}
      </div>
    </div>
  );
}