import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Helper to format dates (e.g. "Nov 2024")
const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';

export function StatSnapshot({ label, pb, sb, icon: Icon, color, bg }) {
    return (
        <Card className="shadow-sm h-full border-slate-200 hover:border-slate-300 transition-colors">
            <CardContent className="p-4 flex flex-col justify-between h-full">
                
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-full ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate" title={label}>
                        {label}
                    </span>
                </div>
                
                <div className="space-y-3">
                    
                    {/* Personal Best Row */}
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">PB</span>
                            <span className="block font-bold text-xl text-gray-900 leading-none">
                                {pb?.score > 0 ? pb.score.toFixed(2) : '--'}
                            </span>
                        </div>
                        {/* Context Details */}
                        {pb?.score > 0 && (
                            <div className="text-right border-t border-dotted pt-1 mt-1">
                                <span className="text-[10px] text-gray-700 font-medium block truncate w-full ml-auto" title={pb.comp}>
                                    {pb.comp}
                                </span>
                                <span className="text-[9px] text-gray-400 block">
                                    {formatDate(pb.date)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Season Best Row */}
                    <div className="pt-2 border-t">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">SB</span>
                            <span className={`block font-bold text-lg leading-none ${sb?.score > 0 ? 'text-brand-blue' : 'text-gray-300'}`}>
                                {sb?.score > 0 ? sb.score.toFixed(2) : '--'}
                            </span>
                        </div>
                        {/* Context Details */}
                        {sb?.score > 0 && (
                            <div className="text-right">
                                <span className="text-[10px] text-gray-600 block truncate w-full ml-auto" title={sb.comp}>
                                    {sb.comp}
                                </span>
                                <span className="text-[9px] text-gray-400 block">
                                    {formatDate(sb.date)}
                                </span>
                            </div>
                        )}
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}

// A simpler variant for single-value stats (like Volume)
export function SingleStatSnapshot({ label, value, subtext, icon: Icon, color, bg }) {
    return (
        <Card className="shadow-sm h-full border-slate-200">
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-full ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                        {label}
                    </span>
                </div>
                <div>
                    <span className="block font-black text-3xl text-gray-900">{value}</span>
                    {subtext && <span className="text-xs text-gray-500 mt-1 block">{subtext}</span>}
                </div>
            </CardContent>
        </Card>
    );
}