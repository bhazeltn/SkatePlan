import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, Handshake, Eye, MapPin } from 'lucide-react'; 
import { FederationFlag } from '@/components/ui/FederationFlag';

export function RosterList({ roster }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster.map((skater) => {
            const isCollaborator = skater.access_level === 'COLLABORATOR';
            const isObserver = skater.access_level === 'VIEWER' || skater.access_level === 'OBSERVER';

            return (
                <a key={skater.id} href={`#/skater/${skater.id}`} className="block h-full">
                    <Card className="hover:border-brand-blue hover:shadow-md transition-all cursor-pointer h-full group relative overflow-hidden">
                        {/* Status Strip */}
                        {(isCollaborator || isObserver) && (
                            <div className={`absolute top-0 left-0 w-1 h-full ${isCollaborator ? 'bg-indigo-500' : 'bg-amber-400'}`} />
                        )}

                        <CardContent className="p-4 flex items-start gap-4">
                            {/* Avatar */}
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isCollaborator ? 'bg-indigo-50 text-indigo-600' : isObserver ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-brand-blue'}`}>
                                {isCollaborator ? <Handshake className="h-6 w-6" /> : isObserver ? <Eye className="h-6 w-6" /> : <User className="h-6 w-6" />}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 truncate pr-2">{skater.full_name}</h4>
                                    {/* Federation Flag Preserved */}
                                    <FederationFlag federation={skater.federation} />
                                </div>
                                
                                {/* DISCIPLINES & LEVELS (Replaces DOB) */}
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