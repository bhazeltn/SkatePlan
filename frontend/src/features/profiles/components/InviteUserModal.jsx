import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, CheckCircle2, ShieldAlert, Info } from 'lucide-react';

export function InviteUserModal({ entityType, entityId, entityName, trigger, skaterDOB, hasGuardian, defaultRole, lockRole }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [emailInput, setEmailInput] = useState(''); 

  // Smart Defaults
  const smartDefault = defaultRole || (entityType === 'Skater' ? 'GUARDIAN' : 'COLLABORATOR');
  const [role, setRole] = useState(smartDefault);

  useEffect(() => {
      if (open) {
          setRole(defaultRole || (entityType === 'Skater' ? 'GUARDIAN' : 'COLLABORATOR'));
      }
  }, [open, defaultRole, entityType]);

  const getAge = (dobString) => {
      if (!dobString) return 18; 
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) { age--; }
      return age;
  };

  const age = entityType === 'Skater' ? getAge(skaterDOB) : 18;
  const isYoungMinor = age < 13;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Split by comma, newline, or space
    const emails = emailInput.split(/[\n, ]+/).map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) {
        alert("Please enter at least one email address.");
        setLoading(false);
        return;
    }

    try {
      await apiRequest('/invitations/send/', 'POST', {
          emails, 
          role,
          entity_type: entityType,
          entity_id: entityId
      }, token);
      
      setSuccess(true);
      setTimeout(() => {
          setOpen(false); setSuccess(false); setEmailInput('');
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
      // TEAMS
      const roles = [
          { value: 'ATHLETE', label: 'Team Member (Athlete)' },
          { value: 'PARENT', label: 'Team Parent' },
          { value: 'COLLABORATOR', label: 'Assistant Coach' },
          { value: 'OBSERVER', label: 'Observer / Judge' }
      ];
      
      if (entityType === 'SynchroTeam') {
           roles.splice(2, 0, { value: 'MANAGER', label: 'Team Manager' });
      }
      
      return roles;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm"><Mail className="h-4 w-4 mr-2" /> Invite User</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User(s)</DialogTitle>
          <DialogDescription>Invite people to join <strong>{entityName}</strong>.</DialogDescription>
        </DialogHeader>

        {success ? (
            <div className="py-8 flex flex-col items-center text-center text-green-600 animate-in fade-in zoom-in">
                <CheckCircle2 className="h-12 w-12 mb-2" /><p className="font-medium">Invitations Sent!</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {/* Validation Messages */}
                {entityType === 'Skater' && isYoungMinor && role === 'ATHLETE' && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-red-800 text-xs flex gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <p><strong>Restricted:</strong> Athletes under 13 cannot have direct accounts. Please invite a Parent/Guardian.</p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                        value={role} 
                        onValueChange={setRole} 
                        disabled={lockRole || (entityType === 'Skater' && isYoungMinor && role === 'ATHLETE')} 
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
                    <Label>Email Address(es)</Label>
                    <Textarea 
                        value={emailInput} 
                        onChange={(e) => setEmailInput(e.target.value)} 
                        placeholder="Enter emails separated by commas or new lines..."
                        className="min-h-[100px]"
                        required 
                    />
                    <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas or new lines.</p>
                </div>

                <DialogFooter className="pt-2">
                    <Button 
                        type="submit" 
                        disabled={loading || (entityType === 'Skater' && isYoungMinor && role === 'ATHLETE')} 
                        className="w-full"
                    >
                        {loading ? 'Sending...' : 'Send Invitations'}
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}