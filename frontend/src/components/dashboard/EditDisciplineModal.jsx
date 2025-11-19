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
import { Pencil } from 'lucide-react'; // Make sure you have lucide-react installed

export function EditDisciplineModal({ entity, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(entity.current_level || entity.level || ''); // Handle both field names
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Determine endpoint and payload key based on entity type
      let endpoint = '';
      let payload = {};

      switch (entity.type) {
        case 'SinglesEntity':
          endpoint = `/entities/singles/${entity.id}/`;
          payload = { current_level: level };
          break;
        case 'SoloDanceEntity':
          endpoint = `/entities/solodance/${entity.id}/`;
          payload = { current_level: level };
          break;
        case 'Team':
          endpoint = `/entities/teams/${entity.id}/`;
          payload = { current_level: level };
          break;
        case 'SynchroTeam':
          endpoint = `/entities/synchro/${entity.id}/`;
          payload = { level: level }; // Synchro uses 'level'
          break;
        default:
          throw new Error("Unknown entity type");
      }

      await apiRequest(endpoint, 'PATCH', payload, token);
      onUpdated(); 
      setOpen(false);
    } catch (err) {
      setError('Failed to update level.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4 text-gray-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Level</DialogTitle>
          <DialogDescription>
            Update the current competitive level for {entity.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="level">Current Level</Label>
            <Input
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. Senior"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}