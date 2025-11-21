import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
// Removed ArrowRight and Button imports

export function TeamList({ teams }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => (
        <Card 
            key={team.id} 
            className="hover:border-brand-blue transition-all group cursor-pointer"
            onClick={() => window.location.hash = `#/team/${team.id}`}
        >
          <CardContent className="p-5 flex items-start justify-between">
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-gray-900">{team.team_name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                  {team.discipline} {team.current_level ? `• ${team.current_level}` : ''}
                </p>
                
                <div className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>{team.partner_a_details?.full_name || `ID: ${team.partner_a}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span>{team.partner_b_details?.full_name || `ID: ${team.partner_b}`}</span>
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