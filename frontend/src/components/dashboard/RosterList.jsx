import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, ArrowRight } from 'lucide-react'; // <--- Add User Icon
import { Button } from '@/components/ui/button'; // <--- Add Button for Arrow

export function RosterList({ roster }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((skater) => (
        <Card
          key={skater.id}
          className="hover:border-brand-blue transition-all cursor-pointer group"
          onClick={() => (window.location.hash = `#/skater/${skater.id}`)}
        >
          <CardContent className="p-5 flex items-start justify-between">
            
            <div className="flex items-start gap-3">
              {/* --- NEW: AVATAR ICON --- */}
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              {/* ------------------------ */}

              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{skater.full_name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                  {skater.federation ? skater.federation.code : 'No Federation'} • {skater.gender}
                </p>

                {/* Disciplines List */}
                <div className="mt-3 space-y-1">
                  {skater.planning_entities && skater.planning_entities.length > 0 ? (
                    skater.planning_entities.map((entity) => (
                      <div key={entity.id} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {/* We rely on entity.name here, which we are about to fix in the backend */}
                        <span>{entity.name}</span>
                        {entity.current_level && (
                           <span className="text-gray-400 text-xs">({entity.current_level})</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No active disciplines.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow Action */}
            <div className="self-center">
                 <Button variant="ghost" size="icon" className="text-gray-300 group-hover:text-brand-blue">
                    <ArrowRight className="h-5 w-5" />
                 </Button>
            </div>

          </CardContent>
        </Card>
      ))}
    </div>
  );
}