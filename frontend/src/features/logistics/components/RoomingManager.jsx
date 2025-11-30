import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, BedDouble, Users, User, Edit2 } from 'lucide-react';

export function RoomingManager({ trip, team, skater, readOnly }) {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form
  const [editRoomId, setEditRoomId] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [occupants, setOccupants] = useState([]); 
  const [guestOccupants, setGuestOccupants] = useState([]); 
  const [selectionTab, setSelectionTab] = useState('skaters');

  const fetchRooms = async () => {
    try {
      const data = await apiRequest(`/trips/${trip.id}/housing/`, 'GET', null, token);
      setRooms(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if(trip?.id) fetchRooms(); }, [trip, token]);

  const openCreate = () => {
      setEditRoomId(null);
      setRoomNumber(''); setOccupants([]); setGuestOccupants([]);
      setIsOpen(true);
  };

  const openEdit = (room) => {
      if (readOnly) return;
      setEditRoomId(room.id);
      setRoomNumber(room.room_number);
      setOccupants(room.occupants.map(o => o.id));
      setGuestOccupants(room.guest_occupants || []);
      setIsOpen(true);
  };

  const toggleOccupant = (id) => {
      if (occupants.includes(id)) setOccupants(occupants.filter(x => x !== id));
      else setOccupants([...occupants, id]);
  };

  const toggleGuest = (guest) => {
      const exists = guestOccupants.find(g => g.id === guest.id);
      if (exists) setGuestOccupants(guestOccupants.filter(g => g.id !== guest.id));
      else setGuestOccupants([...guestOccupants, guest]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        room_number: roomNumber,
        occupant_ids: occupants,
        guest_occupants: guestOccupants
      };

      if (editRoomId) {
          await apiRequest(`/housing/${editRoomId}/`, 'PATCH', payload, token);
      } else {
          await apiRequest(`/trips/${trip.id}/housing/`, 'POST', payload, token);
      }
      
      fetchRooms();
      setIsOpen(false);
    } catch (e) { alert("Failed to save room."); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete room assignment?")) return;
    try { await apiRequest(`/housing/${id}/`, 'DELETE', null, token); fetchRooms(); } 
    catch (e) { alert("Failed."); }
  };

  const visibleRooms = readOnly ? rooms.filter(room => {
      if (skater && room.occupants.some(occ => occ.id === skater.id)) return true;
      if (room.guest_occupants && room.guest_occupants.some(g => ['COACH', 'MANAGER', 'CHAPERONE'].includes(g.role))) return true;
      return false; 
  }) : rooms;

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Housing Assignments</h4>
            {!readOnly && (
                 <Button size="sm" variant="outline" onClick={openCreate}><Plus className="h-3 w-3 mr-1" /> Add Room</Button>
            )}
        </div>

        {/* DIALOG */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editRoomId ? 'Edit Room' : 'Assign Room'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2"><Label>Room Number / Name</Label><Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. Room 304" required /></div>
                    
                    <div className="flex gap-2 border-b pb-2">
                        <button type="button" onClick={() => setSelectionTab('skaters')} className={`text-xs font-bold px-3 py-1 rounded ${selectionTab === 'skaters' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Skaters</button>
                        <button type="button" onClick={() => setSelectionTab('guests')} className={`text-xs font-bold px-3 py-1 rounded ${selectionTab === 'guests' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>Staff & Guests</button>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border p-2 rounded bg-slate-50">
                            {selectionTab === 'skaters' ? (
                                team?.roster?.map(s => (
                                    <div key={s.id} onClick={() => toggleOccupant(s.id)} className={`text-xs p-2 rounded cursor-pointer border ${occupants.includes(s.id) ? 'bg-indigo-100 border-indigo-500 text-indigo-900' : 'bg-white hover:bg-slate-100'}`}>{s.full_name}</div>
                                ))
                            ) : (
                                trip?.guests?.length > 0 ? (
                                    trip.guests.map(g => {
                                        const isSelected = guestOccupants.find(sel => sel.id === g.id);
                                        return (
                                            <div key={g.id} onClick={() => toggleGuest(g)} className={`text-xs p-2 rounded cursor-pointer border ${isSelected ? 'bg-indigo-100 border-indigo-500 text-indigo-900' : 'bg-white hover:bg-slate-100'}`}>
                                                <span className="font-bold block">{g.name}</span>
                                                <span className="text-[10px] uppercase text-gray-500">{g.role}</span>
                                            </div>
                                        );
                                    })
                                ) : <p className="col-span-2 text-xs text-center text-gray-500 italic">No guests added to trip details.</p>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{occupants.length + guestOccupants.length} selected</p>
                    </div>
                    <Button type="submit" className="w-full">Save Assignment</Button>
                </form>
            </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 gap-2">
            {visibleRooms.length === 0 ? <p className="text-xs text-muted-foreground italic">No rooms assigned.</p> : visibleRooms.map(room => (
                <div 
                    key={room.id} 
                    onClick={() => openEdit(room)}
                    className={`flex flex-col p-3 border rounded relative group ${!readOnly ? 'cursor-pointer hover:border-indigo-300' : ''} ${skater && room.occupants.some(o => o.id === skater.id) ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                >
                    <div className="flex items-center gap-2 font-bold text-sm text-gray-900 mb-2">
                        <BedDouble className="h-4 w-4 text-indigo-500" />
                        {room.room_number}
                        {skater && room.occupants.some(o => o.id === skater.id) && <span className="text-[10px] bg-green-200 text-green-800 px-1.5 rounded ml-auto">MY ROOM</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {room.occupants?.map(occ => (<span key={occ.id} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-gray-700 border flex items-center gap-1"><User className="h-3 w-3 text-gray-400" /> {occ.full_name}</span>))}
                        {room.guest_occupants?.map((guest, i) => (<span key={i} className="text-xs bg-amber-50 px-2 py-0.5 rounded text-amber-900 border border-amber-100 flex items-center gap-1"><Users className="h-3 w-3 text-amber-400" /> {guest.name}</span>))}
                    </div>
                    {!readOnly && (
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => handleDelete(room.id, e)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
}