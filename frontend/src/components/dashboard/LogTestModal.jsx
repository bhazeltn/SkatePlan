import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, ChevronLeft } from 'lucide-react';

// Standard categories to guide the user
const DEFAULT_TYPES = ['Skills', 'Freeskate', 'Dance', 'Artistic'];

export function LogTestModal({ skater, testToEdit, onSaved, trigger }) {
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // State
  const [testType, setTestType] = useState('Skills');
  const [isCustomType, setIsCustomType] = useState(false); // Toggle for input mode
  
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [status, setStatus] = useState('PLANNED');
  const [result, setResult] = useState('Pass');
  const [notes, setNotes] = useState('');

  useEffect(() => {
      if (open) {
          if (testToEdit) {
              // Check if existing type is standard or custom
              const currentType = testToEdit.test_type || 'Skills';
              if (DEFAULT_TYPES.includes(currentType)) {
                  setTestType(currentType);
                  setIsCustomType(false);
              } else {
                  setTestType(currentType);
                  setIsCustomType(true);
              }

              setTestName(testToEdit.test_name);
              setTestDate(testToEdit.test_date || '');
              setStatus(testToEdit.status || 'PLANNED');
              setResult(testToEdit.result || 'Pass');
              setNotes(testToEdit.evaluator_notes || '');
          } else {
              // Reset
              setTestType('Skills');
              setIsCustomType(false);
              setTestName('');
              setTestDate('');
              setStatus('PLANNED');
              setResult('Pass');
              setNotes('');
          }
      }
  }, [open, testToEdit]);

  const handleSave = async () => {
      setLoading(true);
      try {
          const payload = {
              test_type: testType,
              test_name: testName,
              test_date: testDate || null,
              status: status,
              result: status === 'COMPLETED' ? result : null,
              evaluator_notes: notes
          };

          if (testToEdit) {
              await apiRequest(`/tests/${testToEdit.id}/`, 'PATCH', payload, token);
          } else {
              await apiRequest(`/skaters/${skater.id}/tests/`, 'POST', payload, token);
          }
          
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to save test."); }
      finally { setLoading(false); }
  };

  const handleDelete = async () => {
      if(!confirm("Delete this record?")) return;
      setLoading(true);
      try {
          await apiRequest(`/tests/${testToEdit.id}/`, 'DELETE', null, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to delete."); }
      finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> Log / Plan Test</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle>{testToEdit ? 'Edit Test Record' : 'Log / Plan Test'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            
            <div className="grid grid-cols-3 gap-4">
                {/* --- SMART CATEGORY SELECTOR --- */}
                <div className="col-span-1 space-y-2">
                    <Label>Category</Label>
                    {!isCustomType ? (
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" 
                            value={testType} 
                            onChange={(e) => {
                                if (e.target.value === 'CUSTOM') {
                                    setIsCustomType(true);
                                    setTestType(''); // Clear for typing
                                } else {
                                    setTestType(e.target.value);
                                }
                            }}
                        >
                            {DEFAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            <option value="CUSTOM">Other...</option>
                        </select>
                    ) : (
                        <div className="flex gap-1">
                            <Input 
                                value={testType} 
                                onChange={(e) => setTestType(e.target.value)} 
                                placeholder="Custom..." 
                                className="h-9"
                                autoFocus
                            />
                            <Button 
                                variant="ghost" size="icon" className="h-9 w-9"
                                onClick={() => { setIsCustomType(false); setTestType('Skills'); }}
                                title="Back to list"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                {/* ------------------------------- */}
                
                <div className="col-span-2 space-y-2">
                    <Label>Test Name</Label>
                    <Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Gold Skills" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Status</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="PLANNED">Planned</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <DatePicker date={testDate} setDate={setTestDate} placeholder="Select Date" />
                </div>
            </div>

            {status === 'COMPLETED' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Result</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={result} onChange={(e) => setResult(e.target.value)}>
                        <option value="Pass">Pass</option>
                        <option value="Honors">Pass with Honors</option>
                        <option value="Retry">Retry</option>
                    </select>
                </div>
            )}

            <div className="space-y-2">
                <Label>Notes / Feedback</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Evaluator feedback..." />
            </div>

            <div className="flex justify-between pt-2">
                 {testToEdit && <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete</Button>}
                 <Button onClick={handleSave} disabled={loading} className={!testToEdit ? "w-full" : ""}>Save Record</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}