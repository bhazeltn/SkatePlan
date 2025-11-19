import React, { useState } from 'react';
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

export function AddSkaterModal({ onSkaterAdded }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  
  // New State
  const [discipline, setDiscipline] = useState('SINGLES');
  const [level, setLevel] = useState('Pre-Juvenile');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        full_name: fullName,
        date_of_birth: dob,
        discipline: discipline, // Send discipline
        level: level // Send level
      };
      const newSkater = await apiRequest('/skaters/create/', 'POST', data, token);
      onSkaterAdded(newSkater);
      setOpen(false);
      
      // Reset Form
      setFullName('');
      setDob('');
      setDiscipline('SINGLES');
    } catch (err) {
      if (err.message.includes('409') || err.message.includes('already exists')) {
        setError('A skater with this name and birthday already exists. Please ask them to grant you access.');
      } else {
        setError(err.message || 'Failed to create skater.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add New Athlete</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Athlete</DialogTitle>
          <DialogDescription>
            Create a new athlete profile. If they already exist, you'll be prompted to request access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Ulrich Salchow"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>
          
          {/* Discipline Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <select
                id="discipline"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
              >
                <option value="SINGLES">Singles</option>
                <option value="SOLO_DANCE">Solo Dance</option>
                <option value="PAIRS">Pairs</option>
                <option value="ICE_DANCE">Ice Dance</option>
                <option value="SYNCHRO">Synchro</option>
              </select>
            </div>
            <div className="space-y-2">
               <Label htmlFor="level">Current Level</Label>
               <Input
                 id="level"
                 value={level}
                 onChange={(e) => setLevel(e.target.value)}
                 placeholder="e.g. Junior"
               />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Athlete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}