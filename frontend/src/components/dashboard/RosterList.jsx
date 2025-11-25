import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, MapPin } from 'lucide-react';
import { FederationFlag } from '@/components/ui/FederationFlag'; // <--- Import

export function RosterList({ roster }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((skater) => (
        <Card 
            key={skater.id} 
            className="hover:border-brand-blue transition-all group cursor-pointer"
            onClick={() => window.location.hash = `#/skater/${skater.id}`}
        >
          <CardContent className="p-5 flex items-start gap-4">
            {/* Avatar / Icon */}
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 border-2 border-white shadow-sm">
                <User className="h-6 w-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 truncate">{skater.full_name}</h3>
                    <FederationFlag federation={skater.federation} />
                </div>
                
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                     {skater.gender && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">{skater.gender.toLowerCase()}</span>
                     )}
                     <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {skater.date_of_birth}
                     </span>
                </div>

                {skater.home_club && (
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" /> {skater.home_club}
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}