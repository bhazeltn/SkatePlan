import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, addDays, parseISO } from 'date-fns';
import { 
    Coffee, 
    Plane, 
    Trophy, 
    Activity, 
    Stethoscope, 
    ClipboardList 
} from 'lucide-react';

export function DayPlanner({ dayIndex, weekStart, data, onChange }) {
  const dateObj = addDays(parseISO(weekStart), dayIndex);
  const dayName = format(dateObj, 'EEEE'); 
  const dateLabel = format(dateObj, 'MMM d'); 
  
  // Default to TRAINING if no status is set
  const status = data?.status || 'TRAINING';

  const handleStatusChange = (e) => {
      onChange(dayIndex, 'status', e.target.value);
      
      // Optional: Clear specific fields if switching contexts? 
      // For now, we keep data safe in the background.
  };

  const handleChange = (field, value) => {
    onChange(dayIndex, field, value);
  };

  // Helper to get config based on status
  const getStatusConfig = () => {
      switch (status) {
          case 'REST':
              return { color: 'bg-slate-50', icon: <Coffee className="h-6 w-6 mb-2 text-slate-400" />, label: 'Rest & Recovery' };
          case 'TRAVEL':
              return { color: 'bg-amber-50', icon: <Plane className="h-6 w-6 mb-2 text-amber-500" />, label: 'Travel Day' };
          case 'COMPETITION':
              return { color: 'bg-purple-50', icon: <Trophy className="h-6 w-6 mb-2 text-purple-500" />, label: 'Competition' };
          case 'INJURY':
              return { color: 'bg-red-50', icon: <Stethoscope className="h-6 w-6 mb-2 text-red-500" />, label: 'Injury / Rehab' };
          case 'TEST':
              return { color: 'bg-blue-50', icon: <ClipboardList className="h-6 w-6 mb-2 text-blue-500" />, label: 'Test Day' };
          default:
              return { color: 'bg-white', icon: null, label: 'Training' };
      }
  };

  const config = getStatusConfig();

  return (
    <Card className={`border shadow-sm transition-colors ${status !== 'TRAINING' ? config.color : 'bg-white'}`}>
      <CardHeader className="py-3 border-b flex flex-row justify-between items-center">
        <div>
            <span className="font-semibold text-gray-900">{dayName}</span>
            <span className="text-xs text-gray-500 font-medium ml-2">{dateLabel}</span>
        </div>
        
        {/* Status Selector */}
        <select 
            className="h-8 w-[110px] text-xs rounded-md border border-input bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={handleStatusChange}
        >
            <option value="TRAINING">Training</option>
            <option value="REST">Rest</option>
            <option value="TRAVEL">Travel</option>
            <option value="COMPETITION">Competition</option>
            <option value="TEST">Test Day</option>
            <option value="INJURY">Injury/Rehab</option>
        </select>
      </CardHeader>
      
      <CardContent className="p-3 space-y-3">
        
        {status === 'TRAINING' ? (
            <>
                {/* Standard Training Inputs */}
                <div className="space-y-1">
                    <Label className="text-xs text-blue-600 font-bold uppercase tracking-wider">On Ice</Label>
                    <Textarea 
                        className="min-h-[60px] text-sm resize-none bg-white focus:ring-blue-500" 
                        placeholder="e.g. Run SP, Jumps..."
                        value={data?.on_ice || ''}
                        onChange={(e) => handleChange('on_ice', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-xs text-orange-600 font-bold uppercase tracking-wider">Off Ice</Label>
                    <Textarea 
                        className="min-h-[40px] text-sm resize-none bg-white focus:ring-orange-500" 
                        placeholder="e.g. Gym, Stretch..."
                        value={data?.off_ice || ''}
                        onChange={(e) => handleChange('off_ice', e.target.value)}
                    />
                </div>
            </>
        ) : (
            /* Special Status View */
            <div className="h-[140px] flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-md bg-white/50 p-2">
                {config.icon}
                <span className="text-sm font-medium text-gray-700 mb-2">{config.label}</span>
                
                {/* Simple Notes for non-training days */}
                <input 
                    className="w-full text-xs text-center bg-transparent border-b border-slate-300 focus:outline-none focus:border-brand-blue placeholder:text-slate-400 pb-1"
                    placeholder="Add notes (e.g. Flight UA123)..."
                    value={data?.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                />
            </div>
        )}

      </CardContent>
    </Card>
  );
}