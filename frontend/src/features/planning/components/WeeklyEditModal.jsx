import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DayPlanner } from '@/features/planning/components/DayPlanner';
import { Lock } from 'lucide-react';

export function WeeklyEditModal({ open, onClose, plans, weekStart, onSaved }) {
    const { token } = useAuth();
    
    // CHANGED: Lazy initialization to set the default index to the first editable plan
    const [selectedPlanIndex, setSelectedPlanIndex] = useState(() => {
        if (plans && plans.length > 0) {
            const firstEditable = plans.findIndex(p => p.can_edit);
            return firstEditable !== -1 ? firstEditable : 0;
        }
        return 0;
    });
    
    const [editData, setEditData] = useState(null);
    const [loading, setLoading] = useState(false);

    // CHANGED: Effect now only handles data synchronization, not index resetting
    useEffect(() => {
        if (open && plans && plans.length > 0) {
            const indexToUse = (selectedPlanIndex < plans.length) ? selectedPlanIndex : 0;
            const planToLoad = plans[indexToUse];
            if (planToLoad) {
                setEditData(JSON.parse(JSON.stringify(planToLoad)));
            }
        }
    }, [open, selectedPlanIndex, plans]);

    // Helper to check permissions
    const isReadOnly = editData ? !editData.can_edit : true;

    const handleSave = async () => {
        if (!editData) return;
        setLoading(true);
        try {
            await apiRequest(`/weeks/${editData.plan_data.id}/`, 'PATCH', {
                theme: editData.plan_data.theme,
                session_breakdown: editData.plan_data.session_breakdown
            }, token);
            
            if (onSaved) onSaved();
            onClose();
        } catch (e) {
            alert("Failed to save plan.");
        } finally {
            setLoading(false);
        }
    };

    const updateState = (dayIdx, field, value) => {
        if (isReadOnly) return;
        const newData = { ...editData };
        const breakdown = newData.plan_data.session_breakdown || {};
        
        if (dayIdx === -1) {
            newData.plan_data.theme = value;
        } else {
            if (!breakdown[dayIdx]) breakdown[dayIdx] = {};
            breakdown[dayIdx][field] = value;
            newData.plan_data.session_breakdown = breakdown;
        }
        setEditData(newData);
    };

    const getGhostEvents = (dayIdx) => {
        if (!plans) return [];
        return plans
            .filter((_, idx) => idx !== selectedPlanIndex)
            .map(p => {
                const dayData = p.plan_data?.session_breakdown?.[dayIdx];
                if (!dayData) return null;
                const hasContent = dayData.status && (dayData.status !== 'TRAINING' || dayData.on_ice || dayData.off_ice || dayData.notes);
                if (!hasContent) return null;

                let summary = dayData.status || 'Training';
                if (summary === 'TRAINING') {
                    summary = dayData.on_ice || dayData.off_ice || "Training";
                }
                return { season: p.label, summary };
            })
            .filter(Boolean);
    };

    if (!open) return null;
    if (!editData) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0 flex flex-row justify-between items-center pr-8">
                    <DialogTitle>Edit Schedule: Week of {weekStart}</DialogTitle>
                    {isReadOnly && (
                        <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded text-sm border border-amber-200">
                            <Lock className="h-3 w-3 mr-2" /> Read Only View
                        </div>
                    )}
                </DialogHeader>
                
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                        <Label>Plan Context:</Label>
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm font-bold text-brand-blue"
                            value={selectedPlanIndex}
                            onChange={(e) => setSelectedPlanIndex(parseInt(e.target.value))}
                        >
                            {plans.map((p, i) => (
                                <option key={i} value={i}>
                                    {p.label} {p.can_edit ? '' : '(Read Only)'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <Label>Weekly Theme</Label>
                        <Input 
                            value={editData.plan_data.theme || ''} 
                            onChange={(e) => updateState(-1, null, e.target.value)} 
                            placeholder="Primary Focus..."
                            disabled={isReadOnly} 
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className={isReadOnly ? "opacity-75 pointer-events-none" : ""}>
                                <DayPlanner 
                                    dayIndex={i}
                                    weekStart={weekStart}
                                    data={editData.plan_data.session_breakdown?.[i] || {}}
                                    onChange={(idx, field, val) => updateState(idx, field, val)}
                                    externalEvents={getGhostEvents(i)} 
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    {!isReadOnly && (
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}