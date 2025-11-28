import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamTripModal } from '@/components/dashboard/TeamTripModal';
import { MapPin, Calendar, Plane, Building, Bus, Edit2, Archive } from 'lucide-react';

import { ItineraryManager } from '../logistics/ItineraryManager';
import { RoomingManager } from '../logistics/RoomingManager';

export function LogisticsTab({ team, skater, isSynchro }) {
  const { user, token } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mySkater, setMySkater] = useState(skater || null); 

  // Permissions
  const isCoach = user?.role === 'COACH' || user?.role === 'COLLABORATOR';
  const readOnly = !isCoach;

  // If parent, find their skater in this team to filter rooms
  useEffect(() => {
      if (user?.role === 'GUARDIAN' && team?.roster && !skater) {
          const findMySkater = async () => {
              try {
                const myRoster = await apiRequest('/roster/', 'GET', null, token);
                const match = myRoster.find(s => team.roster.some(tr => tr.id === s.id));
                if (match) setMySkater(match);
              } catch (e) { console.error(e); }
          };
          findMySkater();
      }
  }, [user, team, skater, token]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      let url = '';
      if (team) url = `/synchro/${team.id}/trips/`;
      else if (skater) url = `/skaters/${skater.id}/trips/`; 

      if (url) {
          const data = await apiRequest(url, 'GET', null, token);
          setTrips(data || []);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (team || skater) fetchTrips(); }, [team, skater, token]);

  // Split Trips
  const activeTrips = trips.filter(t => t.is_active);
  const archivedTrips = trips.filter(t => !t.is_active);

  if (loading) return <div className="p-8 text-center">Loading trips...</div>;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Event Logistics</h3>
            <p className="text-sm text-muted-foreground">Travel, Itineraries, and Housing</p>
        </div>
        {!readOnly && team && <TeamTripModal team={team} onSaved={fetchTrips} />}
      </div>

      {activeTrips.length === 0 && archivedTrips.length === 0 && (
          <div className="text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
             No trips planned.
          </div>
      )}

      {/* ACTIVE TRIPS */}
      <div className="space-y-8">
          {activeTrips.map(trip => (
              <Card key={trip.id} className="overflow-hidden border-l-4 border-l-purple-500 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b pb-3 flex flex-row justify-between items-start">
                      <div>
                          <CardTitle className="text-xl font-bold text-gray-900">{trip.title}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {trip.start_date} to {trip.end_date}</span>
                          </div>
                      </div>
                      {!readOnly && (
                          <TeamTripModal 
                             team={team} 
                             tripToEdit={trip} 
                             onSaved={fetchTrips} 
                             trigger={<Button variant="outline" size="sm"><Edit2 className="h-4 w-4 mr-2" /> Edit Trip</Button>}
                          />
                      )}
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                      {/* 1. Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-dashed">
                          <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Plane className="h-4 w-4 text-gray-400" /> Travel</h4>
                              <TravelSummary segments={trip.travel_segments} />
                          </div>
                          <InfoBlock icon={Building} label="Housing" text={trip.hotel_info} placeholder="No hotel details." />
                          <InfoBlock icon={Bus} label="Local Transport" text={trip.ground_transport_notes} placeholder="No transport details." />
                      </div>
                      {/* 2. Detailed Managers */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <ItineraryManager tripId={trip.id} readOnly={readOnly} /> 
                          </div>
                          <div className="space-y-2">
                              <RoomingManager trip={trip} team={team} skater={mySkater} readOnly={readOnly} />
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

      {/* ARCHIVED TRIPS (COACH ONLY) */}
      {archivedTrips.length > 0 && !readOnly && (
          <div className="pt-8 border-t">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Archive className="h-4 w-4" /> Trip History
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedTrips.map(trip => (
                      <div key={trip.id} className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg opacity-75 hover:opacity-100 transition-opacity">
                          <div>
                              <p className="font-bold text-gray-700">{trip.title}</p>
                              <p className="text-xs text-gray-500">{trip.start_date}</p>
                          </div>
                          <TeamTripModal 
                             team={team} 
                             tripToEdit={trip} 
                             onSaved={fetchTrips} 
                             trigger={<Button variant="ghost" size="sm">View / Restore</Button>}
                          />
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}

// ... Helpers (Keep existing) ...
function InfoBlock({ icon: Icon, label, text, placeholder }) {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-400" /> {label}
            </h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {text || <span className="text-gray-400 italic">{placeholder}</span>}
            </p>
        </div>
    );
}

function TravelSummary({ segments }) {
    if (!segments || segments.length === 0) return <span className="text-sm text-gray-400 italic">No travel booked.</span>;
    return (
        <div className="space-y-2">
            {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-800 bg-white p-2 rounded border shadow-sm">
                    <span className="font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wide text-slate-600">{seg.type}</span>
                    <div className="flex-1 min-w-0 truncate">
                        <span className="font-medium mr-2">{seg.carrier} {seg.number}</span>
                        {seg.dep_time && <span className="text-xs text-gray-500">({seg.dep_time} - {seg.arr_time})</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}