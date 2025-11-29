import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, UserCheck } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        const data = await apiRequest(`/invitations/accept/${token}/`, 'GET');
        setInviteData(data);
        setValid(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!inviteData.user_exists && password !== confirm) {
        return alert("Passwords do not match");
    }
    
    setSubmitting(true);
    try {
        const payload = { password };
        if (!inviteData.user_exists) {
            payload.full_name = fullName;
        }

        const data = await apiRequest(`/invitations/accept/${token}/`, 'POST', payload);
        
        if (data.token) {
            // Determine display name (Use existing from token if available, else form)
            const name = inviteData.user_exists ? "User" : fullName;
            
            setAuth(data.token, { 
                id: data.user_id, 
                role: data.role, 
                email: inviteData.email, 
                full_name: name 
            });
            
            if (data.role === 'SKATER' || data.role === 'ATHLETE') navigate('/my-dashboard');
            else navigate('/'); 
        }
    } catch (err) {
        alert("Failed: " + (err.message || "Unknown error"));
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!valid) return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md border-red-200 p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-700">Invalid Invitation</h2>
              <p className="text-gray-500 mt-2">This link has expired or already been used.</p>
              <Button className="mt-6" onClick={() => navigate('/login')}>Back to Login</Button>
          </Card>
      </div>
  );

  const isExisting = inviteData.user_exists;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                {isExisting ? <UserCheck className="h-6 w-6 text-blue-600" /> : <CheckCircle2 className="h-6 w-6 text-blue-600" />}
            </div>
            <CardTitle className="text-2xl">{isExisting ? 'Accept Collaboration' : 'Welcome to SkatePlan'}</CardTitle>
            <CardDescription>
                {isExisting 
                    ? `Link your existing account to ${inviteData.target}`
                    : `Completing registration as ${inviteData.role} for ${inviteData.target}`
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={inviteData.email} disabled className="bg-slate-50" />
                </div>
                
                {/* SHOW NAME ONLY FOR NEW USERS */}
                {!isExisting && (
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{isExisting ? 'Verify Password' : 'Create Password'}</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>

                {/* SHOW CONFIRM ONLY FOR NEW USERS */}
                {!isExisting && (
                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Processing...' : (isExisting ? 'Accept & Link' : 'Join Now')}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}