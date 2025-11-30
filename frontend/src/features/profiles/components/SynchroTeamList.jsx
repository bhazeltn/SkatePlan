import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Handshake, Eye, Archive } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';

export function SynchroTeamList({ teams }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
            const isCollaborator = team.access_level === 'COLLABORATOR';
            const isObserver = team.access_level === 'VIEWER' || team.access_level === 'OBSERVER';
            const isArchived = team.is_active === false;

            return (
                <a key={team.id} href={`#/synchro/${team.id}`} className="block h-full">
                    <Card className={`hover:border-purple-500 hover:shadow-md transition-all cursor-pointer h-full group relative overflow-hidden ${isArchived ? 'opacity-60 bg-slate-50 border-dashed' : ''}`}>
                        
                        {(isCollaborator || isObserver) && !isArchived && (
                            <div className={`absolute top-0 left-0 w-1 h-full ${isCollaborator ? 'bg-indigo-500' : 'bg-amber-400'}`} />
                        )}

                        {isArchived && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                <Archive className="h-3 w-3" /> Archived
                            </div>
                        )}

                        <CardContent className="p-4 flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isArchived ? 'bg-slate-200 text-slate-400' : 'bg-purple-50 text-purple-600'}`}>
                                {isObserver ? <Eye className="h-6 w-6" /> : (isCollaborator ? <Handshake className="h-6 w-6" /> : <Users className="h-6 w-6" />)}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-bold truncate pr-2 ${isArchived ? 'text-slate-500' : 'text-gray-900'}`}>{team.team_name}</h4>
                                    {!isArchived && <FederationFlag federation={team.federation} />}
                                </div>
                                
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border">Synchro</span>
                                    <span className="text-gray-400">|</span>
                                    <span>{team.level}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </a>
            );
        })}
    </div>
  );
}