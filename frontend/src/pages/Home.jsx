import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiRequest } from '../api';
import { AddSkaterModal } from '../components/dashboard/AddSkaterModal';
import { CreateTeamModal } from '@/components/dashboard/CreateTeamModal';
import { CreateSynchroTeamModal } from '@/components/dashboard/CreateSynchroTeamModal';
import { RosterList } from '../components/dashboard/RosterList';
import { TeamList } from '@/components/dashboard/TeamList';
import { SynchroTeamList } from '@/components/dashboard/SynchroTeamList';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Clock, Calendar, Activity, HeartPulse, CheckCircle2, FileWarning, 
    ArrowRight, ShieldCheck, ClipboardList, Settings // <--- Restored Settings
} from 'lucide-react';

export default function Home() {
  const { user, logout, token } = useAuth();
  const [roster, setRoster] = useState([]);
  const [teams, setTeams] = useState([]); 
  const [synchroTeams, setSynchroTeams] = useState([]); 
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rosterData, teamsData, synchroData, statsData] = await Promise.all([
        apiRequest('/roster/', 'GET', null, token),
        apiRequest('/teams/', 'GET', null, token),
        apiRequest('/synchro/', 'GET', null, token),
        apiRequest('/dashboard/stats/', 'GET', null, token)
      ]);
      
      setRoster(rosterData || []);
      setTeams(teamsData || []);
      setSynchroTeams(synchroData || []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRefresh = () => fetchData();

  // ----- Render for Coach -----
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Coach Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <AddSkaterModal onSkaterAdded={handleRefresh} />
          <CreateTeamModal onTeamCreated={handleRefresh} />
          <CreateSynchroTeamModal onTeamCreated={handleRefresh} />
          
          <a href="#/settings">
             <Button variant="secondary" size="icon">
                <Settings className="h-5 w-5 text-gray-600" />
             </Button>
          </a>
          {/* -------------------------------- */}
          
          <Button variant="outline" onClick={logout}>Log Out</Button>
        </div>
      </div>

      {/* --- WIDGETS ROW --- */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* COL 1: ALERTS STACK */}
            <div className="space-y-6">
                
                {/* A. HEALTH STATUS */}
                <Card className={stats.red_flags?.injuries?.length > 0 ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"}>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                        <HeartPulse className={`h-5 w-5 ${stats.red_flags?.injuries?.length > 0 ? "text-red-600" : "text-green-600"}`} />
                        <CardTitle className="text-base font-semibold text-gray-900">Health Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.red_flags?.injuries?.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                                <ShieldCheck className="h-5 w-5" />
                                All athletes healthy.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.red_flags?.injuries?.map((inj, i) => (
                                    <a 
                                        key={i} 
                                        href={`#/skater/${inj.skater_id}?tab=health`}
                                        className="text-sm flex justify-between items-center text-red-800 bg-white border border-red-100 px-3 py-2 rounded shadow-sm hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <div>
                                            <span className="font-bold block">{inj.skater}</span>
                                            <span className="text-xs opacity-80">{inj.injury}</span>
                                        </div>
                                        <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full font-medium">{inj.status}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* B. PLANNING ALERTS */}
                <Card className={stats.red_flags?.planning?.length > 0 ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-slate-50/50"}>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                        <FileWarning className={`h-5 w-5 ${stats.red_flags?.planning?.length > 0 ? "text-orange-600" : "text-slate-400"}`} />
                        <CardTitle className="text-base font-semibold text-gray-900">Planning Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.red_flags?.planning?.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                All active skaters planned.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.red_flags?.planning?.map((item, i) => (
                                    <a 
                                        key={`plan-${i}`} 
                                        href={`#/skater/${item.id}?tab=${item.issue.includes('Yearly') ? 'yearly' : 'weekly'}`}
                                        className="text-sm flex justify-between items-center text-orange-900 bg-white border border-orange-100 px-3 py-2 rounded shadow-sm hover:bg-orange-50 transition-colors cursor-pointer"
                                    >
                                        <div>
                                            <span className="font-bold block">{item.skater}</span>
                                            <span className="text-xs text-orange-700">{item.issue}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-orange-400" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* C. GOAL TRACKER */}
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                        <Clock className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-base font-semibold text-gray-900">Goal Tracker</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.red_flags?.overdue_goals?.length === 0 && stats.red_flags?.due_soon_goals?.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <ClipboardList className="h-4 w-4" />
                                No urgent goals.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.red_flags?.overdue_goals?.map((g, i) => (
                                    <a 
                                        key={`ov-${i}`} 
                                        href={`#/skater/${g.skater_id}?tab=goals`}
                                        className="text-sm flex justify-between items-center text-red-700 bg-red-50 px-2 py-1.5 rounded border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        <div className="truncate pr-2">
                                            <span className="block font-medium truncate">{g.title}</span>
                                            <span className="text-xs opacity-70">{g.skater_name}</span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-1.5 rounded border border-red-200">Overdue</span>
                                    </a>
                                ))}
                                {stats.red_flags?.due_soon_goals?.map((g, i) => (
                                    <a 
                                        key={`soon-${i}`} 
                                        href={`#/skater/${g.skater_id}?tab=goals`}
                                        className="text-sm flex justify-between items-center text-amber-800 bg-amber-50 px-2 py-1.5 rounded border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                                    >
                                        <div className="truncate pr-2">
                                            <span className="block font-medium truncate">{g.title}</span>
                                            <span className="text-xs opacity-70">{g.skater_name}</span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-1.5 rounded border border-amber-200">Due Soon</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* COL 2: ACTIVITY FEED */}
            <Card className="h-full">
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base font-semibold text-gray-800">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.activity.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 italic text-sm">
                            <Activity className="h-8 w-8 mb-2 opacity-20" />
                            No logs in the last 3 days.
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {stats.activity.map((act, i) => (
                                <a 
                                    key={i} 
                                    href={`#/skater/${act.skater_id}?tab=logs`}
                                    className="block text-sm border-b py-3 last:border-0 first:pt-0 hover:bg-slate-50 px-2 -mx-2 rounded transition-colors"
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-gray-900">{act.skater}</span>
                                        <span className="text-xs text-gray-400">{new Date(act.date).toLocaleDateString(undefined, {weekday:'short', day:'numeric'})}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Logged Session <span className="text-yellow-500 ml-1">{'★'.repeat(act.rating)}</span>
                                    </p>
                                </a>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* COL 3: AGENDA */}
            <Card className="h-full">
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-base font-semibold text-gray-800">Next 14 Days</CardTitle>
                </CardHeader>
                <CardContent>
                     {stats.agenda.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 italic text-sm">
                            <Calendar className="h-8 w-8 mb-2 opacity-20" />
                            No upcoming events or tests.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.agenda.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'Competition' ? 'bg-purple-500' : 'bg-indigo-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{item.type}</span>
                                            <span className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 truncate" title={item.title}>{item.title}</p>
                                        <p className="text-xs text-gray-500 truncate" title={item.who}>{item.who}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      )}

      {/* --- SYNCHRO TEAMS SECTION --- */}
      {synchroTeams.length > 0 && (
          <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Synchro Teams ({synchroTeams.length})</h2>
              <SynchroTeamList teams={synchroTeams} />
          </div>
      )}

      {/* --- PAIRS/DANCE TEAMS SECTION --- */}
      {teams.length > 0 && (
          <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pairs & Dance ({teams.length})</h2>
              <TeamList teams={teams} />
          </div>
      )}

      {/* --- ROSTER SECTION --- */}
      {error && <p className="text-red-600">Error: {error}</p>}

      {roster.length === 0 && teams.length === 0 && synchroTeams.length === 0 && !error && (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">Your Roster is Empty</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            Click the button to add your first athlete and get started.
          </p>
          <AddSkaterModal onSkaterAdded={handleRefresh} />
        </div>
      )}

      {roster.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Individual Athletes ({roster.length})</h2>
          <RosterList roster={roster} />
        </>
      )}
    </div>
  );
}