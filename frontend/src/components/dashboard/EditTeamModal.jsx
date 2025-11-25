import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2 } from 'lucide-react';

export function EditTeamModal({ team, isSynchro, onSaved }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [federationId, setFederationId] = useState('');
  const [federations, setFederations] = useState([]);

  useEffect(() => {
    if (open) {
        setName(team.team_name);
        // Normalize 'level' vs 'current_level'
        setLevel(team.level || team.current_level || ''); 
        setFederationId(team.federation?.id || '');
        
        const fetchFeds = async () => {
            try {
                const data = await apiRequest('/federations/', 'GET', null, token);
                setFederations(data || []);
            } catch(e) { console.error(e); }
        };
        fetchFeds();
    }
  }, [open, team]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const payload = {
            team_name: name,
            federation_id: federationId, // Ensure backend serializer accepts this
        };
        
        if (isSynchro) payload.level = level;
        else payload.current_level = level;

        const url = isSynchro ? `/synchro/${team.id}/` : `/teams/${team.id}/`;
        await apiRequest(url, 'PATCH', payload, token);
        
        if (onSaved) onSaved();
        setOpen(false);
    } catch (err) {
        alert("Failed to update team.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Edit2 className="h-4 w-4 mr-2" /> Edit Details</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Edit Team Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Team Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Level</Label><Input value={level} onChange={(e) => setLevel(e.target.value)} /></div>
            <div className="space-y-2">
                <Label>Federation</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={federationId} onChange={(e) => setFederationId(e.target.value)}>
                    <option value="">Select...</option>
                    {federations.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                </select>
            </div>
            <DialogFooter><Button type="submit" disabled={loading}>Save Changes</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}