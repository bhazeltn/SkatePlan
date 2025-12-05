import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Music, PlayCircle, Trash2, Save, Pencil } from 'lucide-react';
import { PracticeProgramRow } from './PracticeProgramRow';

export function ProgramRunTracker({ skaterId, initialRuns = [], onChange, readOnly }) {
    const { token } = useAuth();
    const [programs, setPrograms] = useState([]);
    
    // List of completed runs
    const [completedRuns, setCompletedRuns] = useState(initialRuns);
    
    // Active Editor State
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [runElements, setRunElements] = useState([]);
    const [isMusic, setIsMusic] = useState(true);
    const [runType, setRunType] = useState('Full'); 

    // Sync initial state
    useEffect(() => {
        setCompletedRuns(initialRuns || []);
    }, [initialRuns]);

    // Load programs
    useEffect(() => {
        if (!skaterId) return;
        const fetchPrograms = async () => {
            try {
                const data = await apiRequest(`/skaters/${skaterId}/programs/`, 'GET', null, token);
                setPrograms(data);
            } catch (e) { console.error("Failed to load programs", e); }
        };
        fetchPrograms();
    }, [skaterId, token]);

    // Notify parent
    useEffect(() => {
        if (!readOnly && onChange) {
            onChange(completedRuns);
        }
    }, [completedRuns, readOnly, onChange]);

    const handleProgramSelect = (val) => {
        const programId = parseInt(val, 10);
        setSelectedProgramId(programId);
        
        const prog = programs.find(p => p.id === programId);
        
        if (prog && prog.planned_elements) {
            const mapped = (prog.planned_elements || []).map(pe => ({
                id: Date.now() + Math.random(),
                name: pe.components?.[0]?.name || pe.type,
                base_value: pe.base_value,
                goe_grade: '0',
                goe_scale: null, 
                score: pe.base_value
            }));
            setRunElements(mapped);
        } else {
            setRunElements([]);
        }
    };

    const updateElementRow = (idx, newData) => {
        setRunElements(prev => {
            const newEls = [...prev];
            newEls[idx] = newData;
            return newEls;
        });
    };

    const removeElementRow = (idx) => {
        setRunElements(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveRun = () => {
        if (!selectedProgramId) return;

        const prog = programs.find(p => p.id === parseInt(selectedProgramId));
        const totalScore = runElements.reduce((sum, el) => sum + parseFloat(el.score || 0), 0);

        const newRun = {
            id: Date.now(),
            program_id: selectedProgramId,
            program_title: prog?.title || 'Unknown Program',
            run_type: runType,
            music: isMusic,
            elements: runElements,
            total_score: totalScore.toFixed(2)
        };

        setCompletedRuns(prev => [...prev, newRun]);
        
        // Reset Editor
        setSelectedProgramId('');
        setRunElements([]);
        setRunType('Full');
    };

    // --- NEW: EDIT RUN FUNCTION ---
    const handleEditRun = (index) => {
        const runToEdit = completedRuns[index];
        
        // 1. Load data back into the "Active" editor variables
        setSelectedProgramId(runToEdit.program_id);
        setRunElements(runToEdit.elements);
        setIsMusic(runToEdit.music);
        setRunType(runToEdit.run_type);
        
        // 2. Remove it from the completed list (it will be re-added when you hit "Finish")
        setCompletedRuns(prev => prev.filter((_, i) => i !== index));
    };

    const deleteRun = (runIndex) => {
        setCompletedRuns(prev => prev.filter((_, i) => i !== runIndex));
    };

    if (!programs) return null; 

    const currentTotalScore = runElements.reduce((sum, el) => sum + parseFloat(el.score || 0), 0).toFixed(2);

    return (
        <div className="space-y-4 border-t pt-4">
            <Label className="flex items-center gap-2 text-base font-bold text-slate-700">
                <PlayCircle className="h-5 w-5" /> Program Runs
            </Label>

            {/* COMPLETED RUNS LIST */}
            {completedRuns.length > 0 ? (
                <div className="space-y-2 mb-4">
                    {completedRuns.map((run, i) => (
                        <div key={run.id || i} className="flex items-center justify-between bg-white border rounded p-3 shadow-sm">
                            <div>
                                <div className="font-bold text-sm text-indigo-900">{run.program_title}</div>
                                <div className="text-xs text-slate-500 flex gap-2">
                                    <span className={`px-1.5 rounded ${run.music ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                                        {run.music ? '🎵 Music' : 'No Music'}
                                    </span>
                                    <span>{run.run_type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right mr-2">
                                    <div className="text-xs text-slate-400">Score</div>
                                    <div className="font-mono font-bold text-indigo-600">{run.total_score}</div>
                                </div>
                                
                                {!readOnly && (
                                    <>
                                        {/* EDIT BUTTON */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600" onClick={() => handleEditRun(i)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteRun(i)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                readOnly && <div className="text-sm text-gray-500 italic">No runs recorded.</div>
            )}

            {/* EDITOR AREA */}
            {!readOnly && (
                !selectedProgramId ? (
                    <div className="bg-slate-50 p-4 rounded-lg border border-dashed flex flex-col items-center gap-2">
                        <span className="text-sm text-slate-500">Record a new run-through?</span>
                        <Select value={String(selectedProgramId)} onValueChange={handleProgramSelect}>
                            <SelectTrigger className="w-[250px] bg-white">
                                <SelectValue placeholder="Select Program to Start..." />
                            </SelectTrigger>
                            <SelectContent>
                                {programs.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.title} ({p.program_category})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {programs.length === 0 && <span className="text-xs text-red-400">No programs found.</span>}
                    </div>
                ) : (
                    <div className="bg-slate-50 p-3 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-wrap gap-3 mb-3 pb-3 border-b border-slate-200">
                            <Select value={runType} onValueChange={setRunType}>
                                <SelectTrigger className="w-[110px] h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full">Full Run</SelectItem>
                                    <SelectItem value="Section">Section</SelectItem>
                                </SelectContent>
                            </Select>

                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded border hover:bg-slate-50 h-8 text-xs">
                                <input type="checkbox" checked={isMusic} onChange={e => setIsMusic(e.target.checked)} />
                                <Music className="h-3 w-3" /> Music
                            </label>

                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-sm font-bold text-indigo-700 mr-2">{currentTotalScore}</span>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500" onClick={() => setSelectedProgramId('')}>Cancel</Button>
                                <Button type="button" size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveRun}>
                                    <Save className="h-3 w-3 mr-1" /> Finish
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1 mb-2 max-h-[300px] overflow-y-auto pr-1">
                            {runElements.map((el, i) => (
                                <PracticeProgramRow 
                                    key={el.id} 
                                    index={i} 
                                    element={el} 
                                    onChange={updateElementRow} 
                                    onRemove={removeElementRow} 
                                />
                            ))}
                        </div>

                        <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                            updateElementRow(runElements.length, { id: Date.now(), name: '', base_value: 0, score: 0 });
                        }}>
                            <Plus className="h-3 w-3 mr-1" /> Add Element
                        </Button>
                    </div>
                )
            )}
        </div>
    );
}