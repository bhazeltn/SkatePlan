import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

export function InviteUserModal({ entityType, entityId, entityName, trigger, skaterDOB, hasGuardian, defaultRole, lockRole }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [email, setEmail] = useState('');
  
  // FIX: Default Logic
  const smartDefault = defaultRole || (entityType === 'Skater' ? 'GUARDIAN' : 'COLLABORATOR');
  const [role, setRole] = useState(smartDefault);

  useEffect(() => {
      if (open) {
          const resetRole = defaultRole || (entityType === 'Skater' ? 'GUARDIAN' : 'COLLABORATOR');
          setRole(resetRole);
      }
  }, [open, defaultRole, entityType]);

  const getAge = (dobString) => {
      if (!dobString) return 18; 
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
      return age;
  };

  const age = entityType === 'Skater' ? getAge(skaterDOB) : 18;
  const isYoungMinor = age < 13;
  const isMatureMinor = age >= 13 && age < 18;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/invitations/send/', 'POST', {
          email,
          role,
          entity_type: entityType,
          entity_id: entityId
      }, token);
      
      setSuccess(true);
      setTimeout(() => {
          setOpen(false); setSuccess(false); setEmail('');
          setRole(defaultRole || (entityType === 'Skater' ? 'GUARDIAN' : 'COLLABORATOR'));
      }, 2000);
    } catch (err) {
      alert(err.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  const getRoles = () => {
      if (entityType === 'Skater') {
          const roles = [
              { value: 'GUARDIAN', label: 'Parent / Guardian (Schedule + Logs)' },
              { value: 'COLLABORATOR', label: 'Collaborating Coach' },
              { value: 'OBSERVER', label: 'Observer (Read Only)' }
          ];
          if (!isYoungMinor) {
              roles.unshift({ value: 'ATHLETE', label: 'Athlete (Login Access)' });
          }
          return roles;
      }
      return [
          { value: 'MANAGER', label: 'Team Manager' },
          { value: 'COLLABORATOR', label: 'Assistant Coach' },
          { value: 'OBSERVER', label: 'Observer' }
      ];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm"><Mail className="h-4 w-4 mr-2" /> Invite User</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Invite someone to join <strong>{entityName}</strong>.</DialogDescription>
        </DialogHeader>

        {success ? (
            <div className="py-8 flex flex-col items-center text-center text-green-600 animate-in fade-in zoom-in">
                <CheckCircle2 className="h-12 w-12 mb-2" /><p className="font-medium">Invitation Sent!</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {isYoungMinor && role === 'ATHLETE' && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-red-800 text-xs flex gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <p><strong>Restricted:</strong> Athletes under 13 cannot have direct accounts. Please invite a Parent/Guardian.</p>
                    </div>
                )}
                {isMatureMinor && role === 'ATHLETE' && !hasGuardian && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-800 text-xs flex gap-2">
                        <Info className="h-4 w-4 shrink-0" />
                        <div>
                            <p className="font-bold">Parental Link Required</p>
                            <p>To encourage Safe Sport compliance, you must invite a <strong>Parent/Guardian</strong> before the athlete can accept their invite.</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                        value={role} 
                        onValueChange={setRole} 
                        disabled={lockRole || (isYoungMinor && role === 'ATHLETE')} 
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {getRoles().map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <DialogFooter className="pt-2">
                    <Button 
                        type="submit" 
                        disabled={loading || (isYoungMinor && role === 'ATHLETE')} 
                        className="w-full"
                    >
                        {loading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}