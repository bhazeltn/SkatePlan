import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SynchroTeamList({ teams }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <Card 
            key={team.id} 
            className="hover:border-brand-blue transition-all group cursor-pointer"
            onClick={() => window.location.hash = `#/synchro/${team.id}`} // We will build this dashboard next session
        >
          <CardContent className="p-5 flex items-start justify-between">
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-gray-900">{team.team_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        {team.level}
                    </span>
                </div>
                
                {/* Federation & Roster Count */}
                <div className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2 text-xs">
                        {team.federation && (
                            <span className="flex items-center gap-1">
                                {team.federation.flag_emoji} {team.federation.code}
                            </span>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>{team.roster?.length || 0} Skaters</span>
                    </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
}