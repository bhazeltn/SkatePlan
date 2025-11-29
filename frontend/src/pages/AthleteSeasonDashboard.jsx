import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, MapPin, ArrowLeft, LogOut, Settings } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';

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
import { GapAnalysisTab } from '@/components/dashboard/tabs/GapAnalysisTab';
import { LogisticsTab } from '@/components/dashboard/tabs/LogisticsTab';

export default function AthleteSeasonDashboard() {
  const params = useParams();
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

  // --- PERMISSIONS LOGIC ---
  // 1. Determine Roles
  const isGuardian = user?.role === 'GUARDIAN';
  const isSkater = user?.role === 'SKATER';
  const isCoach = !isGuardian && !isSkater;
  
  // 2. Determine Context (Owner vs Collaborator)
  // Default to Owner ('COACH') if access_level is missing (legacy)
  const accessLevel = skater?.access_level || 'COACH';
  const isCollaborator = accessLevel === 'COLLABORATOR';

  const permissions = {
      role: user?.role,
      // Coaches (Owners + Collabs) can edit plans, Parents/Skaters cannot
      canEditPlan: isCoach, 
      
      canEditGoals: true,
      canEditLogs: true,
      canEditHealth: true,
      canCreateCompetitions: isCoach,
      canEditCompetitions: true,
      
      // RESTRICTED: Only true Owners can edit profile/invite/delete
      canEditProfile: isCoach && !isCollaborator, 
      
      viewGapAnalysis: isCoach,
      readOnly: !isCoach,       
  };
  // ------------------------

  const formatTabLabel = (str) => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (loading) return <div className="p-8">Loading...</div>;
  if (!skater) return <div className="p-8">Not found or access denied.</div>;

  // --- DYNAMIC TAB LIST ---
  const tabs = ['weekly', 'yearly'];
  if (permissions.viewGapAnalysis) tabs.push('gap_analysis');
  tabs.push('goals', 'programs', 'competitions');
  if (!isCoach && skater?.synchro_teams?.length > 0) {
      tabs.push('synchro_logistics');
  }
  tabs.push('tests', 'logs', 'health', 'analytics', 'profile');

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm"><User className="h-8 w-8" /></div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{skater.full_name}</h1>
                <div className="flex gap-3 text-sm text-muted-foreground mt-1 items-center">
                    <FederationFlag federation={skater.federation} />
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {skater.date_of_birth}</span>
                    {skater.home_club && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {skater.home_club}</span>}
                    {isCollaborator && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase">Collaborating</span>}
                </div>
            </div>
        </div>
        
        {/* HEADER ACTIONS */}
        <div className="flex gap-2">
            {isSkater ? (
                <>
                    <a href="#/settings"><Button variant="secondary" size="icon"><Settings className="h-5 w-5 text-gray-600" /></Button></a>
                    <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Log Out</Button>
                </>
            ) : (
                <a href="#/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Button></a>
            )}
        </div>
      </div>

      <div className="flex space-x-2 border-b mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{formatTabLabel(tab)}</button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'weekly' && <WeeklyPlanTab skater={skater} readOnly={permissions.readOnly} />}
        {activeTab === 'yearly' && <YearlyPlansTab skater={skater} readOnly={permissions.readOnly} />}
        {activeTab === 'gap_analysis' && <GapAnalysisTab skater={skater} />}
        {activeTab === 'goals' && <GoalsTab skater={skater} permissions={permissions} />}
        {activeTab === 'programs' && <ProgramsTab skater={skater} readOnly={permissions.readOnly} />}
        {activeTab === 'competitions' && <CompetitionsTab skater={skater} permissions={permissions} readOnly={false} />}
        
        {activeTab === 'synchro_logistics' && <LogisticsTab skater={skater} isSynchro={true} />}

        {activeTab === 'tests' && <TestsTab skater={skater} permissions={permissions} />}
        {activeTab === 'logs' && <LogsTab skater={skater} permissions={permissions} />}
        {activeTab === 'health' && <HealthTab skater={skater} permissions={permissions} />}
        {activeTab === 'analytics' && <AnalyticsTab skater={skater} />}
        
        {/* PASS STRICT READ-ONLY for Collaborators on Profile */}
        {activeTab === 'profile' && <ProfileTab skater={skater} onUpdated={fetchSkater} readOnly={!permissions.canEditProfile} />}
      </div>
    </div>
  );
}