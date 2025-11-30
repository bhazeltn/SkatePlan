import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgramModal } from '@/features/performance/components/ProgramModal';
import { Music, User } from 'lucide-react';

export function ProgramsTab({ skater, team, isSynchro, readOnly, permissions }) {
  const { token } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUrl = isSynchro 
    ? `/synchro/${team.id}/programs/`
    : (team ? `/teams/${team.id}/programs/` : `/skaters/${skater.id}/programs/`);

  const fetchPrograms = async () => {
      try {
          setLoading(true);
          const data = await apiRequest(fetchUrl, 'GET', null, token);
          setPrograms(data || []);
      } catch (e) { 
          console.error(e); 
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { if (skater || team) fetchPrograms(); }, [skater, team, token]);

  const sortedPrograms = [...programs].sort((a, b) => {
      if (a.is_active === b.is_active) return b.season.localeCompare(a.season);
      return a.is_active ? -1 : 1; 
  });

  if (loading) return <div className="p-8 text-center">Loading programs...</div>;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Programs</h3>
            <p className="text-sm text-muted-foreground">Music, Choreography, and Layouts</p>
        </div>
        
        {!readOnly && (
            <ProgramModal 
                skater={skater} 
                team={team} 
                isSynchro={isSynchro}
                onSaved={fetchPrograms} 
                permissions={permissions}
            />
        )}
      </div>

      {programs.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
            No programs recorded for this season.
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedPrograms.map(prog => (
                  <ProgramModal 
                    key={prog.id}
                    skater={skater} 
                    team={team}
                    isSynchro={isSynchro}
                    programToEdit={prog} 
                    readOnly={readOnly} 
                    permissions={permissions}
                    onSaved={fetchPrograms} 
                    trigger={
                      <Card className={`hover:border-brand-blue hover:shadow-md transition-all cursor-pointer relative group h-full ${!prog.is_active ? 'opacity-60 bg-gray-50 border-dashed' : ''}`}>
                          <CardContent className="p-5">
                              {!prog.is_active && (
                                  <div className="absolute top-4 right-4 px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] uppercase font-bold rounded">
                                      Archived
                                  </div>
                              )}

                              <div className="mb-4">
                                  <h5 className="font-bold text-lg text-gray-900">{prog.title}</h5>
                                  <div className="flex gap-2 text-xs mt-2">
                                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-medium">
                                        {prog.program_category}
                                      </span>
                                      <span className="bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
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
                    }
                  />
              ))}
          </div>
      )}
    </div>
  );
}