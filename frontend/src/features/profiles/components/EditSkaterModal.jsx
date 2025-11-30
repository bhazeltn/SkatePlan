import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
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

export function EditSkaterModal({ skater, onSkaterUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [federationId, setFederationId] = useState('');
  
  // Data for dropdowns
  const [federations, setFederations] = useState([]);

  // Initialize form when modal opens or skater changes
  useEffect(() => {
    if (skater) {
      setFullName(skater.full_name || '');
      setDob(skater.date_of_birth || '');
      
      // Map the display gender back to the code if needed, 
      // OR rely on the backend sending the code in a separate field.
      // Ideally, we should update the backend SkaterSerializer to send BOTH 
      // label and code, but for now we can map commonly used ones or rely on simple matching.
      // Since our GET serializer sends "Female" (Display), but PUT needs "FEMALE" (Code),
      // we need to be careful. 
      
      // Quick mapping fix for the MVP:
      const genderMap = { 'Male': 'MALE', 'Female': 'FEMALE', 'Non-Binary': 'NON_BINARY', 'Other': 'OTHER' };
      setGender(genderMap[skater.gender] || '');

      setHomeClub(skater.home_club || '');
      setFederationId(skater.federation ? skater.federation.id : '');
    }
  }, [skater]);

  // Fetch Federations
  useEffect(() => {
    if (open) {
        const fetchFeds = async () => {
            try {
                const data = await apiRequest('/federations/', 'GET', null, token);
                setFederations(data || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchFeds();
    }
  }, [open, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        full_name: fullName,
        date_of_birth: dob,
        gender: gender,
        home_club: homeClub,
        federation: federationId || null
      };
      
      await apiRequest(`/skaters/${skater.id}/`, 'PATCH', data, token);
      onSkaterUpdated(); // Trigger a refresh in the parent
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update personal information for {skater.full_name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dob">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender</Label>
              <select
                id="edit-gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="NON_BINARY">Non-Binary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-homeClub">Home Club/Rink</Label>
              <Input
                id="edit-homeClub"
                value={homeClub}
                onChange={(e) => setHomeClub(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="edit-federation">Federation</Label>
              <select
                id="edit-federation"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={federationId}
                onChange={(e) => setFederationId(e.target.value)}
              >
                <option value="">Select Federation...</option>
                {federations.map((fed) => (
                  <option key={fed.id} value={fed.id}>
                    {fed.flag_emoji} {fed.name}
                  </option>
                ))}
              </select>
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