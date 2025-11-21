import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgramModal } from '@/components/dashboard/ProgramModal';
import { Music, User, Edit2 } from 'lucide-react';

export function ProgramsTab({ skater }) {
  const { token } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = async () => {
      try {
          setLoading(true);
          const data = await apiRequest(`/skaters/${skater.id}/programs/`, 'GET', null, token);
          setPrograms(data || []);
      } catch (e) { 
          console.error(e); 
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (skater) fetchPrograms();
  }, [skater, token]);

  // Sort: Active first, then by Season descending
  const sortedPrograms = [...programs].sort((a, b) => {
      if (a.is_active === b.is_active) {
          return b.season.localeCompare(a.season); // Newest season first
      }
      return a.is_active ? -1 : 1; // Active first
  });

  if (loading) return <div className="p-8 text-center">Loading programs...</div>;

  return (
    <div className="space-y-6">
        
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Programs</h3>
            <p className="text-sm text-muted-foreground">Music, Choreography, and Layouts</p>
        </div>
        <ProgramModal skater={skater} onSaved={fetchPrograms} />
      </div>

      {/* Program List */}
      {programs.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
            No programs recorded.
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedPrograms.map(prog => (
                  <Card 
                    key={prog.id} 
                    className={`hover:border-brand-blue transition-colors relative group ${!prog.is_active ? 'opacity-60 bg-gray-100 border-dashed' : ''}`}
                  >
                      <CardContent className="p-5">
                          {/* Edit Button */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ProgramModal 
                                skater={skater} 
                                programToEdit={prog} 
                                onSaved={fetchPrograms} 
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-brand-blue">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                }
                              />
                          </div>

                          {/* Archived Badge */}
                          {!prog.is_active && (
                              <div className="absolute top-4 right-12 px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] uppercase font-bold rounded">
                                  Archived
                              </div>
                          )}

                          <div className="mb-4">
                              <h5 className="font-bold text-lg text-gray-900">{prog.title}</h5>
                              <div className="flex gap-2 text-xs mt-2">
                                  <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-medium">
                                    {prog.program_category}
                                  </span>
                                  <span className="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded">
                                    {prog.season}
                                  </span>
                              </div>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-700 border-t pt-4">
                              <div className="flex items-center gap-2">
                                  <Music className="h-4 w-4 text-brand-blue shrink-0" /> 
                                  <span className="italic">{prog.music_title || "Music not set"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400 shrink-0" /> 
                                  <span>{prog.choreographer ? `Choreo: ${prog.choreographer}` : "Choreographer not set"}</span>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
}