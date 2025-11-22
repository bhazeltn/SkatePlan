import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export function CreateTeamModal({ onTeamCreated }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Data
  const [skaters, setSkaters] = useState([]);
  
  // Form
  const [teamName, setTeamName] = useState('');
  const [discipline, setDiscipline] = useState('ICE_DANCE');
  const [partnerA, setPartnerA] = useState('');
  const [partnerB, setPartnerB] = useState('');
  const [level, setLevel] = useState('');

  // Load Roster on Open to populate dropdowns
  useEffect(() => {
      if (open) {
          const fetchRoster = async () => {
              try {
                  const data = await apiRequest('/roster/', 'GET', null, token);
                  setSkaters(data || []);
              } catch (e) { console.error(e); }
          };
          fetchRoster();
      }
  }, [open, token]);

  // Auto-generate team name suggestion
  useEffect(() => {
      if (partnerA && partnerB) {
          const p1 = skaters.find(s => String(s.id) === partnerA);
          const p2 = skaters.find(s => String(s.id) === partnerB);
          if (p1 && p2) {
              const name1 = p1.full_name.split(' ').pop(); // Last Name
              const name2 = p2.full_name.split(' ').pop();
              setTeamName(`${name1} & ${name2}`);
          }
      }
  }, [partnerA, partnerB, skaters]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (partnerA === partnerB) return alert("Partners must be different people.");
      
      setLoading(true);
      try {
          await apiRequest('/teams/create/', 'POST', {
              team_name: teamName,
              discipline,
              partner_a_id: partnerA,
              partner_b_id: partnerB,
              level
          }, token);
          
          if (onTeamCreated) onTeamCreated();
          setOpen(false);
          
          // Reset
          setPartnerA(''); setPartnerB(''); setTeamName(''); setLevel('');
      } catch (e) {
          alert("Failed to create team. " + (e.message || ""));
      } finally {
          setLoading(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" /> 
            Add Dance/Pair Team
        </Button>
      </DialogTrigger>
      {/* ... (Dialog Content same as before) ... */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Create Pairs / Dance Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
                <Label>Discipline</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                    <option value="ICE_DANCE">Ice Dance</option>
                    <option value="PAIRS">Pairs</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Partner A</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={partnerA} onChange={(e) => setPartnerA(e.target.value)} required>
                        <option value="">Select...</option>
                        {skaters.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Partner B</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={partnerB} onChange={(e) => setPartnerB(e.target.value)} required>
                        <option value="">Select...</option>
                        {skaters.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Smith & Jones" />
            </div>
            
            <div className="space-y-2">
                <Label>Current Level</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Novice" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>Create Team</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}