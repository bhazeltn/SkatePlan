import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Coffee, Plane, Trophy, Activity, Stethoscope, ClipboardList } from 'lucide-react';

export function UnifiedDayCard({ date, plans }) {
  const dayName = format(parseISO(date), 'EEEE');
  const dayLabel = format(parseISO(date), 'MMM d');

  // Helper to get icon/style based on status
  const getStatusStyle = (status) => {
      switch (status) {
          case 'REST': return { icon: <Coffee className="h-3 w-3" />, bg: 'bg-slate-100 text-slate-600', label: 'Rest' };
          case 'TRAVEL': return { icon: <Plane className="h-3 w-3" />, bg: 'bg-amber-100 text-amber-700', label: 'Travel' };
          case 'COMPETITION': return { icon: <Trophy className="h-3 w-3" />, bg: 'bg-purple-100 text-purple-700', label: 'Comp' };
          case 'INJURY': return { icon: <Stethoscope className="h-3 w-3" />, bg: 'bg-red-100 text-red-700', label: 'Injury' };
          case 'TEST': return { icon: <ClipboardList className="h-3 w-3" />, bg: 'bg-blue-100 text-blue-700', label: 'Test' };
          default: return { icon: <Activity className="h-3 w-3" />, bg: 'bg-white border-slate-200 text-gray-900', label: 'Training' };
      }
  };

  // Filter out empty plans
  const activePlans = plans.filter(p => {
      const data = p.data || {};
      // FIX: Default to TRAINING if undefined
      const status = data.status || 'TRAINING'; 
      
      if (status === 'TRAINING') {
          // Only show training if there is actual content
          return data.on_ice || data.off_ice || data.notes;
      }
      // Always show non-training events (Rest, Travel, etc)
      return true;
  });

  return (
    <Card className="h-full flex flex-col border-slate-200 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="py-2 px-3 border-b bg-slate-50/50 flex flex-row justify-between items-center">
        <span className="font-bold text-sm text-gray-700">{dayName}</span>
        <span className="text-xs text-gray-400 font-mono">{dayLabel}</span>
      </CardHeader>
      
      <CardContent className="p-2 flex-1 space-y-2 bg-slate-50/30">
          {activePlans.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-300 italic min-h-[80px]">
                  Free Day
              </div>
          ) : (
              activePlans.map((item, idx) => {
                  // FIX: Default to TRAINING here too for rendering
                  const status = item.data.status || 'TRAINING';
                  const style = getStatusStyle(status);

                  return (
                      <div key={idx} className={`text-xs p-2 rounded border ${style.bg} ${status === 'TRAINING' ? 'border-slate-200 bg-white' : 'border-transparent'}`}>
                          <div className="flex justify-between items-center mb-1">
                              <span className="font-bold uppercase text-[10px] tracking-wider opacity-80">{item.label}</span>
                              {status !== 'TRAINING' && style.icon}
                          </div>
                          
                          {/* Content Rendering */}
                          {status === 'TRAINING' ? (
                              <div className="space-y-1">
                                  {item.data.on_ice && (
                                      <div className="pl-1.5 border-l-2 border-blue-400">
                                          <span className="font-semibold text-blue-600 block text-[10px]">ON ICE</span>
                                          <p className="line-clamp-4 leading-tight whitespace-pre-wrap">{item.data.on_ice}</p>
                                      </div>
                                  )}
                                  {item.data.off_ice && (
                                      <div className="pl-1.5 border-l-2 border-orange-400">
                                          <span className="font-semibold text-orange-600 block text-[10px]">OFF ICE</span>
                                          <p className="line-clamp-4 leading-tight whitespace-pre-wrap">{item.data.off_ice}</p>
                                      </div>
                                  )}
                                  {/* Fallback if only notes are used in Training mode */}
                                  {!item.data.on_ice && !item.data.off_ice && item.data.notes && (
                                      <p className="italic text-slate-600">{item.data.notes}</p>
                                  )}
                              </div>
                          ) : (
                              // Non-Training Content (Rest, Travel, etc)
                              <p className="font-medium">{item.data.notes || style.label}</p>
                          )}
                      </div>
                  );
              })
          )}
      </CardContent>
    </Card>
  );
}