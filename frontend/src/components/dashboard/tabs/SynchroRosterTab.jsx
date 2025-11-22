import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, UserMinus, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function SynchroRosterTab({ team, onUpdate }) {
  const { token } = useAuth();
  const [fullRoster, setFullRoster] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch the coach's full roster to allow selection
  useEffect(() => {
      const fetchRoster = async () => {
          try {
              const data = await apiRequest('/roster/', 'GET', null, token);
              setFullRoster(data || []);
          } catch (e) { console.error(e); }
      };
      fetchRoster();
  }, [token]);

  // Sync selectedIds with the team's current roster when opening edit mode
  useEffect(() => {
      if (team?.roster) {
          setSelectedIds(team.roster.map(s => s.id));
      }
  }, [team]);

  const toggleSkater = (skaterId) => {
      if (selectedIds.includes(skaterId)) {
          setSelectedIds(selectedIds.filter(id => id !== skaterId));
      } else {
          setSelectedIds([...selectedIds, skaterId]);
      }
  };

  const handleSaveRoster = async () => {
      setLoading(true);
      try {
          await apiRequest(`/synchro/${team.id}/`, 'PATCH', {
              roster_ids: selectedIds
          }, token);
          
          if (onUpdate) onUpdate();
          setIsEditing(false);
      } catch (e) {
          alert("Failed to update roster.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-semibold">Team Roster</h3>
                <p className="text-sm text-muted-foreground">
                    {team.roster?.length || 0} Skaters Assigned
                </p>
            </div>
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                    <Button>
                        <UserPlus className="h-4 w-4 mr-2" /> Manage Roster
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage {team.team_name} Roster</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Select skaters from your individual roster to add to this team.</p>
                        
                        {fullRoster.length === 0 ? (
                             <div className="text-center p-4 border rounded bg-slate-50">
                                 You have no individual skaters. Add them to your main dashboard first.
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {fullRoster.map(skater => {
                                    const isSelected = selectedIds.includes(skater.id);
                                    return (
                                        <div 
                                            key={skater.id}
                                            onClick={() => toggleSkater(skater.id)}
                                            className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 border-purple-500' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-400'}`}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>{skater.full_name}</p>
                                                <p className="text-xs text-gray-500">{skater.gender}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Button onClick={handleSaveRoster} disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Roster'}
                    </Button>
                </DialogContent>
            </Dialog>
        </div>

        {/* Roster Display */}
        {(!team.roster || team.roster.length === 0) ? (
            <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                No skaters assigned. Click "Manage Roster" to build your team.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.roster.map(skater => (
                    <Card key={skater.id} className="group relative hover:border-purple-200 transition-colors">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{skater.full_name}</h4>
                                <a href={`#/skater/${skater.id}`} className="text-xs text-purple-600 hover:underline">View Profile</a>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
    </div>
  );
}