import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FederationFlag } from '@/components/ui/FederationFlag';
import { Edit2 } from 'lucide-react';

export function EditSynchroTeamModal({ team, onSaved }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [federationId, setFederationId] = useState('');
  
  const [federations, setFederations] = useState([]);

  useEffect(() => {
    if (open && team) {
        setName(team.team_name);
        setLevel(team.level);
        setFederationId(team.federation?.id ? String(team.federation.id) : '');
        
        // Fetch Feds
        const fetchFeds = async () => {
            try {
                const data = await apiRequest('/federations/', 'GET', null, token);
                setFederations(data || []);
            } catch (e) { console.error(e); }
        };
        fetchFeds();
    }
  }, [open, team, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await apiRequest(`/synchro/${team.id}/`, 'PATCH', {
            team_name: name,
            level: level,
            federation_id: federationId || null
        }, token);
        
        if (onSaved) onSaved();
        setOpen(false);
    } catch (e) {
        alert("Failed to update team.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Edit2 className="h-4 w-4 mr-2" /> Edit Team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Edit Synchro Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label>Level / Category</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label>Federation</Label>
                <Select value={federationId} onValueChange={setFederationId}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                        {federations.map(fed => (
                            <SelectItem key={fed.id} value={String(fed.id)}>
                                <div className="flex items-center gap-2">
                                    <FederationFlag federation={fed} />
                                    <span>{fed.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}