import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export function CreateSynchroTeamModal({ onTeamCreated }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [federations, setFederations] = useState([]);
  
  // Form State
  const [teamName, setTeamName] = useState('');
  const [level, setLevel] = useState('');
  const [federationId, setFederationId] = useState('');

  // Fetch Federations on open
  useEffect(() => {
      if (open) {
          const fetchFeds = async () => {
              try {
                  const data = await apiRequest('/federations/', 'GET', null, token);
                  setFederations(data || []);
                  // Default to Canada/USA if found, or first option
                  if (data?.length > 0) setFederationId(data[0].id);
              } catch (e) { console.error(e); }
          };
          fetchFeds();
      }
  }, [open, token]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          await apiRequest('/synchro/create/', 'POST', {
              team_name: teamName,
              level: level,
              federation: federationId
          }, token);
          
          if (onTeamCreated) onTeamCreated();
          setOpen(false);
          
          // Reset
          setTeamName(''); setLevel('');
      } catch (e) {
          alert("Failed to create team. Name might be taken.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" /> 
            Add Synchro Team
        </Button>
      </DialogTrigger>
      {/* ... (Dialog Content same as before) ... */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Create Synchro Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Ice Angels" required />
            </div>
            <div className="space-y-2">
                <Label>Level / Category</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Junior" required />
            </div>
            <div className="space-y-2">
                <Label>Federation</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={federationId} onChange={(e) => setFederationId(e.target.value)}>
                    {federations.map(fed => (<option key={fed.id} value={fed.id}>{fed.flag_emoji} {fed.name}</option>))}
                </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Team'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}