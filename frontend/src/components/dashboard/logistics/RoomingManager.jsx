import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, BedDouble, Users } from 'lucide-react';

export function RoomingManager({ tripId, team }) {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form
  const [roomNumber, setRoomNumber] = useState('');
  const [occupants, setOccupants] = useState([]); // Array of IDs

  const fetchRooms = async () => {
    try {
      const data = await apiRequest(`/trips/${tripId}/housing/`, 'GET', null, token);
      setRooms(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRooms(); }, [tripId, token]);

  const toggleOccupant = (id) => {
      if (occupants.includes(id)) setOccupants(occupants.filter(x => x !== id));
      else setOccupants([...occupants, id]);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/trips/${tripId}/housing/`, 'POST', {
        room_number: roomNumber,
        occupant_ids: occupants // Send IDs to backend
      }, token);
      fetchRooms();
      setIsAdding(false);
      setRoomNumber(''); setOccupants([]);
    } catch (e) { alert("Failed to add room."); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete room assignment?")) return;
    try { await apiRequest(`/housing/${id}/`, 'DELETE', null, token); fetchRooms(); } 
    catch (e) { alert("Failed."); }
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Housing</h4>
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add Room</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Assign Room</DialogTitle></DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2"><Label>Room Number / Name</Label><Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. Room 304" required /></div>
                        
                        <div className="space-y-2">
                            <Label>Occupants</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border p-2 rounded">
                                {team?.roster?.map(skater => (
                                    <div 
                                        key={skater.id}
                                        onClick={() => toggleOccupant(skater.id)}
                                        className={`text-xs p-2 rounded cursor-pointer border ${occupants.includes(skater.id) ? 'bg-indigo-100 border-indigo-500 text-indigo-900' : 'bg-white hover:bg-slate-50'}`}
                                    >
                                        {skater.full_name}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{occupants.length} selected</p>
                        </div>
                        <Button type="submit" className="w-full">Save Assignment</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-2">
            {rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No rooms assigned.</p>
            ) : (
                rooms.map(room => (
                    <div key={room.id} className="flex flex-col p-3 border rounded bg-white relative group">
                        <div className="flex items-center gap-2 font-bold text-sm text-gray-900 mb-2">
                            <BedDouble className="h-4 w-4 text-indigo-500" />
                            {room.room_number}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {room.occupants?.map(occ => (
                                <span key={occ.id} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-gray-700 border">
                                    {occ.full_name}
                                </span>
                            ))}
                        </div>
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(room.id)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}