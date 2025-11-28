import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { User, ArrowRight, ShieldCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GuardianDashboard() {
    const { user, logout, token } = useAuth();
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const data = await apiRequest('/roster/', 'GET', null, token);
                setAthletes(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchRoster();
    }, [token]);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
                    <p className="text-muted-foreground">Welcome, {user?.full_name}</p>
                </div>
                <div className="flex gap-2">
                    {/* Settings Button for Profile/Account Deletion */}
                    <a href="#/settings">
                        <Button variant="secondary" size="icon">
                            <Settings className="h-5 w-5 text-gray-600" />
                        </Button>
                    </a>
                    <Button variant="outline" onClick={logout}>Log Out</Button>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="text-sm font-medium">You are logged in as a Guardian. You have read-only access to your athletes' schedules and progress.</p>
                </div>

                <h2 className="text-xl font-bold text-gray-800">My Athletes</h2>
                
                {loading ? (
                    <div>Loading...</div>
                ) : athletes.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                        No athletes linked to your account yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {athletes.map(skater => (
                            <Card 
                                key={skater.id} 
                                className="hover:border-indigo-500 transition-all cursor-pointer group"
                                onClick={() => window.location.hash = `#/skater/${skater.id}`}
                            >
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{skater.full_name}</h3>
                                        <p className="text-sm text-muted-foreground">{skater.home_club || 'No Club'}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}