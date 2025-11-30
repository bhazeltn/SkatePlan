import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiRequest } from '@/api';
import { AddSkaterModal } from '../components/dashboard/AddSkaterModal';
import { CreateTeamModal } from '@/components/dashboard/CreateTeamModal';
import { CreateSynchroTeamModal } from '@/components/dashboard/CreateSynchroTeamModal';
import { RosterList } from '../components/dashboard/RosterList';
import { TeamList } from '@/components/dashboard/TeamList';
import { SynchroTeamList } from '@/components/dashboard/SynchroTeamList';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
    Clock, Calendar, Activity, HeartPulse, CheckCircle2, FileWarning, 
    ShieldCheck, ClipboardList, Settings, Plus, Users, UserPlus, Handshake, Eye
} from 'lucide-react'; // Added Eye
import GuardianDashboard from './GuardianDashboard';
import { Navigate } from 'react-router-dom';

export default function Home() {
  const { user, logout, token } = useAuth();
  
  if (user?.role === 'GUARDIAN') return <GuardianDashboard />;
  if (user?.role === 'SKATER') {
      if (user.skater_id) return <Navigate to={`/skater/${user.skater_id}`} replace />;
      return <div className="p-12 text-center"><h2 className="text-xl font-bold">Profile Not Found</h2><Button variant="outline" onClick={logout}>Log Out</Button></div>;
  }

  // ... (State and Fetch logic remain the same) ...
  const [roster, setRoster] = useState([]);
  const [teams, setTeams] = useState([]);
  const [synchroTeams, setSynchroTeams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleActionComplete = () => { fetchData(); setMenuOpen(false); };

  // --- SPLIT ROSTER LOGIC ---
  const mySkaters = roster.filter(s => !s.access_level || s.access_level === 'COACH' || s.access_level === 'OWNER');
  const sharedSkaters = roster.filter(s => s.access_level === 'COLLABORATOR');
  
  // NEW: OBSERVED SKATERS
  const observedSkaters = roster.filter(s => s.access_level === 'VIEWER' || s.access_level === 'OBSERVER');

  const SharedBadge = ({ isShared }) => isShared ? <Handshake className="h-3 w-3 text-indigo-500 ml-1 inline" /> : null;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Coach Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild><Button className="bg-brand-blue hover:bg-brand-blue/90 text-white"><Plus className="h-4 w-4 mr-2" /> Create New...</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 flex flex-col gap-2 bg-white shadow-lg border rounded-md">
                 <AddSkaterModal onSkaterAdded={handleActionComplete} trigger={<Button variant="ghost" className="w-full justify-start h-10 font-normal"><UserPlus className="h-4 w-4 mr-2 text-gray-500" /> Athlete</Button>}/>
                 <CreateTeamModal onTeamCreated={handleActionComplete} trigger={<Button variant="ghost" className="w-full justify-start h-10 font-normal"><Users className="h-4 w-4 mr-2 text-indigo-500" /> Pair/Dance Team</Button>}/>
                 <CreateSynchroTeamModal onTeamCreated={handleActionComplete} trigger={<Button variant="ghost" className="w-full justify-start h-10 font-normal"><Users className="h-4 w-4 mr-2 text-purple-500" /> Synchro Team</Button>}/>
            </PopoverContent>
          </Popover>
          <a href="#/settings"><Button variant="secondary" size="icon"><Settings className="h-5 w-5 text-gray-600" /></Button></a>
          <Button variant="outline" onClick={logout}>Log Out</Button>
        </div>
      </div>

      {/* Stats Widgets (Same as before) */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* ... (Content preserved) ... */}
             <Card className={stats.red_flags?.injuries?.length > 0 ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"}>
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0"><HeartPulse className={`h-5 w-5 ${stats.red_flags?.injuries?.length > 0 ? "text-red-600" : "text-green-600"}`} /><CardTitle className="text-base font-semibold text-gray-900">Health Status</CardTitle></CardHeader>
                <CardContent>
                    {stats.red_flags?.injuries?.length === 0 ? (<div className="flex items-center gap-2 text-sm text-green-700 font-medium"><ShieldCheck className="h-5 w-5" /> All athletes healthy.</div>) : (<div className="space-y-2">{stats.red_flags?.injuries?.map((inj, i) => (<a key={i} href={`#/skater/${inj.skater_id}?tab=health`} className="text-sm flex justify-between items-center text-red-800 bg-white border border-red-100 px-3 py-2 rounded shadow-sm hover:bg-red-50 transition-colors cursor-pointer"><div><span className="font-bold">{inj.skater}</span><SharedBadge isShared={inj.is_shared}/><span className="text-xs opacity-80 block">{inj.injury}</span></div><span className="text-xs bg-red-100 px-2 py-0.5 rounded-full font-medium">{inj.status}</span></a>))}</div>)}
                </CardContent>
            </Card>
            <Card className={stats.red_flags?.planning?.length > 0 ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-slate-50/50"}>
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0"><FileWarning className={`h-5 w-5 ${stats.red_flags?.planning?.length > 0 ? "text-orange-600" : "text-slate-400"}`} /><CardTitle className="text-base font-semibold text-gray-900">Planning Status</CardTitle></CardHeader>
                <CardContent>
                    {stats.red_flags?.planning?.length === 0 ? (<div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-slate-400" /> All active skaters planned.</div>) : (<div className="space-y-2">{stats.red_flags?.planning?.map((item, i) => (<div key={i} className="text-sm text-orange-900 bg-white border border-orange-100 px-3 py-2 rounded shadow-sm"><span className="font-bold">{item.skater}</span><SharedBadge isShared={item.is_shared}/>: {item.issue}</div>))}</div>)}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0"><Clock className="h-5 w-5 text-amber-500" /><CardTitle className="text-base font-semibold text-gray-900">Goal Tracker</CardTitle></CardHeader>
                <CardContent>
                        {(!stats.red_flags?.overdue_goals || stats.red_flags.overdue_goals.length === 0) ? <div className="flex items-center gap-2 text-sm text-slate-500"><ClipboardList className="h-4 w-4" /> No urgent goals.</div> : <div className="space-y-2">{stats.red_flags.overdue_goals.map((g, i) => (<div key={i} className="text-sm text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100"><span className="font-bold">{g.title}</span> (Overdue)<br/><span className="text-[10px] text-red-500">{g.skater_name}</span><SharedBadge isShared={g.is_shared}/></div>))}</div>}
                </CardContent>
            </Card>
            <Card className="h-full"><CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0"><Activity className="h-5 w-5 text-blue-500" /><CardTitle className="text-base font-semibold text-gray-800">Recent Activity</CardTitle></CardHeader><CardContent>{stats.activity.length === 0 ? <div className="text-sm text-slate-400 italic">No recent activity.</div> : <div className="space-y-0">{stats.activity.map((act, i) => (<a key={i} href={act.link || '#'} className="block text-sm border-b py-3 hover:bg-slate-50 px-2 -mx-2 rounded transition-colors"><div className="flex justify-between mb-1"><span className="font-bold text-gray-900">{act.skater} <SharedBadge isShared={act.is_shared}/></span><span className="text-xs text-gray-400">{new Date(act.date).toLocaleDateString()}</span></div><p className="text-xs text-gray-600">Logged Session <span className="text-yellow-500">{'★'.repeat(act.rating)}</span></p></a>))}</div>}</CardContent></Card>
            <Card className="h-full"><CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0"><Calendar className="h-5 w-5 text-purple-500" /><CardTitle className="text-base font-semibold text-gray-800">Next 14 Days</CardTitle></CardHeader><CardContent>{stats.agenda.length === 0 ? <div className="text-sm text-slate-400 italic">No upcoming events.</div> : <div className="space-y-3">{stats.agenda.map((item, i) => (<div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded"><div className={`w-2 h-2 rounded-full ${item.type === 'Competition' ? 'bg-purple-500' : 'bg-indigo-500'}`} /><div className="min-w-0 flex-1"><div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">{item.type}</span><span className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></div><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs text-gray-500 truncate">{item.who} <SharedBadge isShared={item.is_shared}/></p></div></div>))}</div>}</CardContent></Card>
        </div>
      )}

      {/* --- MY ROSTER --- */}
      {synchroTeams.length > 0 && <div className="mb-8"><h2 className="text-xl font-bold text-gray-900 mb-4">Synchro Teams</h2><SynchroTeamList teams={synchroTeams} /></div>}
      {teams.length > 0 && <div className="mb-8"><h2 className="text-xl font-bold text-gray-900 mb-4">Pairs & Dance</h2><TeamList teams={teams} /></div>}
      {mySkaters.length > 0 && <div className="mb-8"><h2 className="text-xl font-bold text-gray-900 mb-4">My Athletes</h2><RosterList roster={mySkaters} /></div>}
      
      {/* --- COLLABORATIONS --- */}
      {sharedSkaters.length > 0 && (
          <div className="mb-8 pt-6 border-t border-dashed">
              <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Handshake className="h-6 w-6 text-indigo-600" /> Collaborations
              </h2>
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                  <RosterList roster={sharedSkaters} />
              </div>
          </div>
      )}

      {/* --- NEW: OBSERVED PORTFOLIOS --- */}
      {observedSkaters.length > 0 && (
          <div className="mb-8 pt-6 border-t border-dashed">
              <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-slate-500" /> Shared with Me
              </h2>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <RosterList roster={observedSkaters} />
                  <p className="text-xs text-gray-500 mt-2 italic">You have Read-Only access to these portfolios.</p>
              </div>
          </div>
      )}

      {!roster.length && !teams.length && !synchroTeams.length && !loading && (
          <div className="text-center p-12 border-2 border-dashed rounded-lg"><h2 className="text-2xl font-semibold">Your Roster is Empty</h2><p className="text-muted-foreground mt-2">Use the "Create New" button to get started.</p></div>
      )}
    </div>
  );
}