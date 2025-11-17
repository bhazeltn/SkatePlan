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
        date_of_birth: dob, // "YYYY-MM-DD"
      };
      const newSkater = await apiRequest('/skaters/create/', 'POST', data, token);
      onSkaterAdded(newSkater); // Pass the new skater back to the parent
      setOpen(false); // Close the modal
      setFullName('');
      setDob('');
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
            Enter the athlete's details. This will check for duplicates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
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