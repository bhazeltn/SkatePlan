import React from 'react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/button';

export default function Home() {
  const { user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Welcome, {user.full_name}!</h1>
        <Button variant="outline" onClick={logout}>
          Log Out
        </Button>
      </div>
      <p>Your role is: <strong>{user.role}</strong></p>
      <p>Your email is: <strong>{user.email}</strong></p>
    </div>
  );
}