import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export function AddSkaterModal({ onSkaterAdded }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [federationId, setFederationId] = useState('');
  const [discipline, setDiscipline] = useState('SINGLES');
  const [level, setLevel] = useState('');

  // Data State
  const [federations, setFederations] = useState([]);

  useEffect(() => {
    if (open) {
        const fetchFeds = async () => {
            try {
                const data = await apiRequest('/federations/', 'GET', null, token);
                setFederations(data || []);
                if (data && data.length > 0) setFederationId(data[0].id);
            } catch (e) { console.error(e); }
        };
        fetchFeds();
    }
  }, [open, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/skaters/', 'POST', {
        full_name: fullName,
        date_of_birth: dob,
        gender,
        home_club: homeClub,
        federation_id: federationId,
        discipline,
        level
      }, token);

      if (onSkaterAdded) onSkaterAdded();
      setOpen(false);
      
      setFullName(''); setDob(''); setGender(''); setHomeClub(''); setLevel('');
    } catch (err) {
      alert('Failed to add skater. Name/DOB collision?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="h-4 w-4 mr-2" /> 
            Add Skater
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Athlete</DialogTitle>
          <DialogDescription>
            Create a profile for a new skater. This will start their training history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="NON_BINARY">Non-Binary</option>
                    <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fed">Federation</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={federationId} onChange={(e) => setFederationId(e.target.value)}>
                    {federations.map(f => (<option key={f.id} value={f.id}>{f.flag_emoji} {f.name}</option>))}
                </select>
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="club">Home Club</Label>
            <Input id="club" value={homeClub} onChange={(e) => setHomeClub(e.target.value)} placeholder="e.g. Toronto Cricket Club" />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Discipline</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                    <option value="SINGLES">Singles</option>
                    <option value="SOLO_DANCE">Solo Dance</option>
                    <option value="PAIRS">Pairs</option>
                    <option value="ICE_DANCE">Ice Dance</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Current Level</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Junior" />
              </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Athlete'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}