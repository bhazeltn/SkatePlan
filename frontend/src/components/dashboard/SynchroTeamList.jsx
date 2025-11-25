import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag';

export function SynchroTeamList({ teams }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <Card 
            key={team.id} 
            className="hover:border-purple-500 transition-all group cursor-pointer"
            onClick={() => window.location.hash = `#/synchro/${team.id}`}
        >
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 border-2 border-white shadow-sm">
                <Users className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 truncate">{team.team_name}</h3>
                    <FederationFlag federation={team.federation} />
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        {team.level}
                    </span>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                    {team.roster?.length || 0} Skaters on Roster
                </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}