import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plane, Building, Bus, CalendarPlus, Plus, Trash2, Train, Car, Users, UserPlus, Archive } from 'lucide-react';

export function TeamTripModal({ team, tripToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Basic Info
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true); // <--- New State
  
  // Logistics
  const [hotelInfo, setHotelInfo] = useState('');
  const [transportNotes, setTransportNotes] = useState('');
  
  // JSON Lists
  const [segments, setSegments] = useState([]); 
  const [guests, setGuests] = useState([]); 

  useEffect(() => {
    if (open) {
        if (tripToEdit) {
            setTitle(tripToEdit.title);
            setStartDate(tripToEdit.start_date);
            setEndDate(tripToEdit.end_date);
            setIsActive(tripToEdit.is_active); // <--- Load State
            setHotelInfo(tripToEdit.hotel_info || '');
            setTransportNotes(tripToEdit.ground_transport_notes || '');
            setSegments(tripToEdit.travel_segments || []);
            setGuests(tripToEdit.guests || []);
        } else {
            setTitle(''); setStartDate(''); setEndDate(''); setIsActive(true);
            setHotelInfo(''); setTransportNotes('');
            setSegments([]); setGuests([]);
        }
    }
  }, [open, tripToEdit]);

  // ... (Segment & Guest Handlers remain the same) ...
  const addSegment = () => setSegments([...segments, { id: Date.now(), type: 'FLIGHT', carrier: '', number: '', dep_time: '', arr_time: '' }]);
  const removeSegment = (id) => setSegments(segments.filter(s => s.id !== id));
  const updateSegment = (id, field, value) => setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  const addGuest = () => setGuests([...guests, { id: Date.now(), name: '', role: 'CHAPERONE' }]);
  const removeGuest = (id) => setGuests(guests.filter(g => g.id !== id));
  const updateGuest = (id, field, value) => setGuests(guests.map(g => g.id === id ? { ...g, [field]: value } : g));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive, // <--- Send State
        hotel_info: hotelInfo,
        ground_transport_notes: transportNotes,
        travel_segments: segments,
        guests: guests
      };

      if (tripToEdit) {
        await apiRequest(`/trips/${tripToEdit.id}/`, 'PATCH', payload, token);
      } else {
        await apiRequest(`/synchro/${team.id}/trips/`, 'POST', payload, token);
      }
      
      if (onSaved) onSaved();
      setOpen(false);
    } catch (err) {
      alert('Failed to save trip.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
      // Toggles state and saves immediately
      setLoading(true);
      try {
          await apiRequest(`/trips/${tripToEdit.id}/`, 'PATCH', { is_active: !isActive }, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed."); }
      finally { setLoading(false); }
  };

  const handleDelete = async () => {
      if(!confirm("Delete this trip?")) return;
      setLoading(true);
      try {
          await apiRequest(`/trips/${tripToEdit.id}/`, 'DELETE', null, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to delete."); }
      finally { setLoading(false); }
  }

  const getSegmentIcon = (type) => {
      if (type === 'FLIGHT') return <Plane className="h-4 w-4" />;
      if (type === 'TRAIN') return <Train className="h-4 w-4" />;
      if (type === 'BUS') return <Bus className="h-4 w-4" />;
      return <Car className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><CalendarPlus className="h-4 w-4 mr-2" /> Plan New Trip</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tripToEdit ? 'Edit Trip Details' : 'Plan Team Trip'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ... (Basic Info Section Same) ... */}
          <div className="space-y-4 p-4 bg-slate-50 rounded border">
              <div className="space-y-2"><Label>Trip Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Nationals 2025" required /></div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start Date</Label><DatePicker date={startDate} setDate={setStartDate} /></div>
                  <div className="space-y-2"><Label>End Date</Label><DatePicker date={endDate} setDate={setEndDate} /></div>
              </div>
          </div>

          {/* ... (Travel Segments Same) ... */}
          <div className="space-y-3">
              <div className="flex justify-between items-center"><Label className="flex items-center gap-2"><Plane className="h-4 w-4" /> Travel Arrangements</Label><Button type="button" size="sm" variant="outline" onClick={addSegment}><Plus className="h-3 w-3 mr-1" /> Add Leg</Button></div>
              <div className="space-y-2">
                  {segments.length === 0 && <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">No travel segments added.</p>}
                  {segments.map((seg) => (
                      <div key={seg.id} className="flex flex-col gap-2 p-3 border rounded bg-white relative group">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => removeSegment(seg.id)}><Trash2 className="h-3 w-3" /></Button>
                          <div className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-3 space-y-1">
                                  <Label className="text-[10px]">Type</Label>
                                  <div className="flex items-center">
                                      <div className="bg-slate-100 p-2 rounded-l border-y border-l">{getSegmentIcon(seg.type)}</div>
                                      <select className="h-9 rounded-r border text-xs w-full" value={seg.type} onChange={(e) => updateSegment(seg.id, 'type', e.target.value)}><option value="FLIGHT">Flight</option><option value="TRAIN">Train</option><option value="BUS">Bus</option><option value="CAR">Car</option></select>
                                  </div>
                              </div>
                              <div className="col-span-3 space-y-1"><Label className="text-[10px]">Carrier</Label><Input className="h-9 text-xs" placeholder="e.g. Air Canada" value={seg.carrier} onChange={(e) => updateSegment(seg.id, 'carrier', e.target.value)} /></div>
                              <div className="col-span-2 space-y-1"><Label className="text-[10px]">Number</Label><Input className="h-9 text-xs" placeholder="#123" value={seg.number} onChange={(e) => updateSegment(seg.id, 'number', e.target.value)} /></div>
                              <div className="col-span-2 space-y-1"><Label className="text-[10px]">Depart</Label><Input type="time" className="h-9 text-xs" value={seg.dep_time} onChange={(e) => updateSegment(seg.id, 'dep_time', e.target.value)} /></div>
                              <div className="col-span-2 space-y-1"><Label className="text-[10px]">Arrive</Label><Input type="time" className="h-9 text-xs" value={seg.arr_time} onChange={(e) => updateSegment(seg.id, 'arr_time', e.target.value)} /></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* ... (Guests & Staff Same) ... */}
          <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center"><Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Staff & Guests</Label><Button type="button" size="sm" variant="outline" onClick={addGuest}><UserPlus className="h-3 w-3 mr-1" /> Add Person</Button></div>
              <div className="space-y-2">
                  {guests.length === 0 && <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">No staff or guests added.</p>}
                  {guests.map((guest) => (
                      <div key={guest.id} className="flex items-end gap-2 p-2 border rounded bg-white relative group">
                          <div className="flex-1 space-y-1"><Label className="text-[10px]">Name</Label><Input className="h-8 text-xs" value={guest.name} onChange={(e) => updateGuest(guest.id, 'name', e.target.value)} placeholder="Name" /></div>
                          <div className="w-32 space-y-1"><Label className="text-[10px]">Role</Label><select className="h-8 w-full rounded border text-xs px-2" value={guest.role} onChange={(e) => updateGuest(guest.id, 'role', e.target.value)}><option value="COACH">Coach</option><option value="MANAGER">Manager</option><option value="CHAPERONE">Chaperone</option><option value="PARENT">Parent</option><option value="OTHER">Other</option></select></div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => removeGuest(guest.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  ))}
              </div>
          </div>

          {/* ... (Housing Info Same) ... */}
          <div className="space-y-4 border-t pt-4">
              <div className="space-y-2"><Label className="flex items-center gap-2"><Building className="h-4 w-4" /> Accommodation</Label><Textarea placeholder="Hotel info..." value={hotelInfo} onChange={(e) => setHotelInfo(e.target.value)} className="min-h-[60px]" /></div>
              <div className="space-y-2"><Label className="flex items-center gap-2"><Bus className="h-4 w-4" /> Destination Ground Transport</Label><Textarea placeholder="Shuttle info..." value={transportNotes} onChange={(e) => setTransportNotes(e.target.value)} className="min-h-[60px]" /></div>
          </div>

          {/* FOOTER WITH ARCHIVE */}
          <div className="flex justify-between items-center pt-2 border-t">
            {tripToEdit ? (
                <div className="flex gap-2">
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>Delete</Button>
                    {/* NEW: Archive Toggle */}
                    <Button type="button" variant="outline" onClick={handleArchive}>
                        <Archive className="h-4 w-4 mr-2" /> {isActive ? 'Archive' : 'Restore'}
                    </Button>
                </div>
            ) : (<div></div>)}
            <Button type="submit" disabled={loading}>Save Details</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}