import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, Handshake, Eye, MapPin, Archive } from 'lucide-react'; 
import { FederationFlag } from '@/components/ui/FederationFlag';

export function RosterList({ roster }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster.map((skater) => {
            const isCollaborator = skater.access_level === 'COLLABORATOR';
            const isObserver = skater.access_level === 'VIEWER' || skater.access_level === 'OBSERVER';
            // FIX: Strict check for false ensures undefined defaults to "Active"
            const isArchived = skater.is_active === false;

            return (
                <a key={skater.id} href={`#/skater/${skater.id}`} className="block h-full">
                    <Card className={`hover:border-brand-blue hover:shadow-md transition-all cursor-pointer h-full group relative overflow-hidden ${isArchived ? 'opacity-60 bg-slate-50 border-dashed' : ''}`}>
                        {/* Status Strip */}
                        {(isCollaborator || isObserver) && !isArchived && (
                            <div className={`absolute top-0 left-0 w-1 h-full ${isCollaborator ? 'bg-indigo-500' : 'bg-amber-400'}`} />
                        )}

                        {isArchived && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                <Archive className="h-3 w-3" /> Archived
                            </div>
                        )}

                        <CardContent className="p-4 flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isArchived ? 'bg-slate-200 text-slate-400' : isCollaborator ? 'bg-indigo-50 text-indigo-600' : isObserver ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-brand-blue'}`}>
                                {isCollaborator ? <Handshake className="h-6 w-6" /> : isObserver ? <Eye className="h-6 w-6" /> : <User className="h-6 w-6" />}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-bold truncate pr-2 ${isArchived ? 'text-slate-500' : 'text-gray-900'}`}>{skater.full_name}</h4>
                                    {!isArchived && <FederationFlag federation={skater.federation} />}
                                </div>
                                
                                {/* DISCIPLINES & LEVELS */}
                                <div className="mt-1 space-y-1">
                                    {skater.planning_entities && skater.planning_entities.length > 0 ? (
                                        skater.planning_entities.map((ent, i) => (
                                            <div key={i} className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block mr-1 border border-slate-200">
                                                {ent.name} <span className="text-slate-400 font-normal">|</span> {ent.current_level || 'No Level'}
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No discipline assigned</span>
                                    )}
                                </div>

                                {/* Home Club */}
                                {skater.home_club && (
                                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3" /> {skater.home_club}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </a>
            );
        })}
    </div>
  );
}