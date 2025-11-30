import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MapPin, ArrowLeft, LogOut, Settings, Handshake, Eye } from 'lucide-react'; // Removed Calendar
import { FederationFlag } from '@/components/ui/FederationFlag';
import { useAccessControl } from '@/hooks/useAccessControl';

// Tabs
import { WeeklyPlanTab } from '@/features/planning/components/WeeklyPlanTab';
import { YearlyPlansTab } from '@/features/planning/components/YearlyPlansTab';
import { GoalsTab } from '@/features/performance/components/GoalsTab';
import { ProgramsTab } from '@/features/performance/components/ProgramsTab';
import { CompetitionsTab } from '@/features/performance/components/CompetitionsTab';
import { TestsTab } from '@/features/performance/components/TestsTab';
import { LogsTab } from '@/features/health/components/LogsTab';
import { HealthTab } from '@/features/health/components/HealthTab';
import { AnalyticsTab } from '@/features/performance/components/AnalyticsTab';
import { ProfileTab } from '@/features/profiles/components/ProfileTab';
import { GapAnalysisTab } from '@/features/planning/components/GapAnalysisTab';
import { LogisticsTab } from '@/features/logistics/components/LogisticsTab';

export default function AthleteSeasonDashboard() {
  const params = useParams();
  const location = useLocation();
  const id = params.id || params.skaterId;
  const { token, user, logout } = useAuth();
  const [skater, setSkater] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);

  const fetchSkater = async () => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${id}/`, 'GET', null, token);
      setSkater(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSkater(); }, [id, token]);

  useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      if (tab) {
          setActiveTab(tab);
      }
  }, [location.search]);

  // --- CENTRALIZED PERMISSIONS ---
  const perms = useAccessControl(skater);
  // -------------------------------

  const formatTabLabel = (str) => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (loading) return <div className="p-8">Loading...</div>;
  if (!skater) return <div className="p-8">Not found or access denied.</div>;

  const tabs = ['weekly'];
  if (perms.canViewYearlyPlan) tabs.push('yearly');
  if (perms.canViewGapAnalysis) tabs.push('gap_analysis');
  if (perms.canViewPerformance) tabs.push('goals', 'programs', 'competitions');

  if (skater?.synchro_teams?.length > 0 && perms.canViewLogistics) {
      tabs.push('synchro_logistics');
  }

  if (perms.canViewHealth) tabs.push('tests', 'logs', 'health', 'analytics');
  
  tabs.push('profile');

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm"><User className="h-8 w-8" /></div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{skater.full_name}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1 items-center">
                    
                    {/* Federation */}
                    <FederationFlag federation={skater.federation} />
                    
                    {/* Disciplines & Levels (Replaces DOB) */}
                    <div className="flex items-center gap-2">
                        {skater.planning_entities && skater.planning_entities.length > 0 ? (
                            skater.planning_entities.map((ent, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-xs font-medium">
                                    {ent.name} ({ent.current_level || '-'})
                                </span>
                            ))
                        ) : (
                            <span className="text-xs italic text-gray-400">No Discipline</span>
                        )}
                    </div>

                    {/* Home Club */}
                    {skater.home_club && <span className="flex items-center gap-1 text-gray-400 border-l pl-3 ml-1"><MapPin className="h-3 w-3" /> {skater.home_club}</span>}
                    
                    {/* Role Badges */}
                    {perms.isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase flex items-center gap-1"><Handshake className="h-3 w-3"/> Collaborating</span>}
                    {perms.isObserver && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase flex items-center gap-1"><Eye className="h-3 w-3"/> Observer</span>}
                </div>
            </div>
        </div>
        
        <div className="flex gap-2">
            {perms.isSelf ? (
                <>
                    <a href="#/settings"><Button variant="secondary" size="icon"><Settings className="h-5 w-5 text-gray-600" /></Button></a>
                    <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Log Out</Button>
                </>
            ) : (
                <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button></a>
            )}
        </div>
      </div>

      {/* ... Tabs & Content (Same as before) ... */}
      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{formatTabLabel(tab)}</button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'weekly' && <WeeklyPlanTab skater={skater} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'yearly' && <YearlyPlansTab skater={skater} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab skater={skater} readOnly={perms.readOnlyStructure} />}
        {activeTab === 'goals' && <GoalsTab skater={skater} permissions={perms} />}
        {activeTab === 'programs' && <ProgramsTab skater={skater} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'competitions' && <CompetitionsTab skater={skater} permissions={perms} readOnly={!perms.canEditCompetitions} />}
        {activeTab === 'synchro_logistics' && <LogisticsTab skater={skater} isSynchro={true} readOnly={perms.readOnlyStructure} permissions={perms} />}
        {activeTab === 'tests' && <TestsTab skater={skater} permissions={perms} readOnly={!perms.canEditCompetitions} />}
        {activeTab === 'logs' && <LogsTab skater={skater} permissions={perms} />}
        {activeTab === 'health' && <HealthTab skater={skater} permissions={perms} />}
        {activeTab === 'analytics' && <AnalyticsTab skater={skater} />}
        {activeTab === 'profile' && <ProfileTab skater={skater} onUpdated={fetchSkater} readOnly={!perms.canEditProfile} permissions={perms} />}
      </div>
    </div>
  );
}