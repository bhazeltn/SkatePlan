import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, MapPin, Clock, Bus, Coffee, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function ItineraryManager({ tripId }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [activity, setActivity] = useState('');
  const [startTime, setStartTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('OTHER');

  const fetchItems = async () => {
    try {
      const data = await apiRequest(`/trips/${tripId}/itinerary/`, 'GET', null, token);
      setItems(data || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [tripId, token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/trips/${tripId}/itinerary/`, 'POST', {
        start_time: startTime, // Backend expects ISO datetime, or handle date logic
        activity,
        location,
        category
      }, token);
      fetchItems();
      setIsAdding(false);
      setActivity(''); setStartTime(''); setLocation('');
    } catch (e) { alert("Failed to add item."); }
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Delete this item?")) return;
    try {
      await apiRequest(`/itinerary/${itemId}/`, 'DELETE', null, token);
      fetchItems();
    } catch (e) { alert("Failed to delete."); }
  };

  const getIcon = (cat) => {
      switch(cat) {
          case 'TRAVEL': return <Bus className="h-4 w-4 text-amber-500" />;
          case 'ICE': return <User className="h-4 w-4 text-blue-500" />;
          case 'MEAL': return <Coffee className="h-4 w-4 text-orange-500" />;
          default: return <Clock className="h-4 w-4 text-gray-400" />;
      }
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Itinerary</h4>
            
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Schedule Item</DialogTitle></DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Time (Date & Time)</Label>
                            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Activity</Label>
                            <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Practice Ice" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Rink B" />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <select className="flex h-9 w-full rounded-md border bg-white px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="TRAVEL">Travel</option>
                                <option value="ICE">On Ice</option>
                                <option value="OFF_ICE">Off Ice</option>
                                <option value="MEAL">Meal</option>
                                <option value="MEETING">Meeting</option>
                                <option value="COMPETITION">Competition</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full">Add to Schedule</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No items scheduled.</p>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 border rounded bg-white hover:bg-slate-50 group">
                        <div className="w-16 text-xs font-bold text-gray-500 text-right shrink-0">
                            {format(parseISO(item.start_time), 'h:mm a')}
                            <div className="text-[9px] font-normal">{format(parseISO(item.start_time), 'MMM d')}</div>
                        </div>
                        <div className="w-8 flex justify-center">{getIcon(item.category)}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.activity}</p>
                            {item.location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.location}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}