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
import { Pencil } from 'lucide-react';

export function EditSafetyModal({ skater, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // State for fields
  const [skaterEmail, setSkaterEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Load data when modal opens
  useEffect(() => {
    if (skater && skater.profile) {
      setSkaterEmail(skater.profile.skater_email || '');
      setGuardianName(skater.profile.guardian_name || '');
      setGuardianEmail(skater.profile.guardian_email || '');
      setEmergencyName(skater.profile.emergency_contact_name || '');
      setEmergencyPhone(skater.profile.emergency_contact_phone || '');
      setMedicalNotes(skater.profile.relevant_medical_notes || '');
    }
  }, [skater, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        profile: {
          skater_email: skaterEmail,
          guardian_name: guardianName,
          guardian_email: guardianEmail,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          relevant_medical_notes: medicalNotes,
        }
      };

      await apiRequest(`/skaters/${skater.id}/`, 'PATCH', payload, token);
      onUpdated();
      setOpen(false);
    } catch (err) {
      alert('Failed to update safety info.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4 text-gray-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Safety & Contact Information</DialogTitle>
          <DialogDescription>
            Manage emergency contacts and invite details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Contact / Invite Section */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-md border">
            <h4 className="text-sm font-semibold text-gray-900">Contact & Invites</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Skater Email</Label>
                    <Input value={skaterEmail} onChange={(e) => setSkaterEmail(e.target.value)} placeholder="skater@example.com" />
                </div>
                <div className="space-y-2">
                    <Label>Guardian Email</Label>
                    <Input value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="parent@example.com" />
                </div>
                <div className="space-y-2 col-span-2">
                    <Label>Guardian Name</Label>
                    <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Parent/Guardian Name" />
                </div>
            </div>
          </div>

          {/* Emergency Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Medical Notes (Allergies, etc.)</Label>
                <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={medicalNotes} 
                    onChange={(e) => setMedicalNotes(e.target.value)} 
                />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Information'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}