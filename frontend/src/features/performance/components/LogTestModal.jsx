import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, ChevronLeft, Video, FileText, Trash2, Lock } from 'lucide-react';

const DEFAULT_TYPES = ['Skills', 'Freeskate', 'Dance', 'Artistic'];

export function LogTestModal({ skater, testToEdit, onSaved, trigger, canDelete, readOnly }) { // <--- Added readOnly
  const [open, setOpen] = useState(false);
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // ... (State same as before) ...
  const [testType, setTestType] = useState('Skills');
  const [isCustomType, setIsCustomType] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('COMPLETED');
  const [result, setResult] = useState('Pass');
  const [notes, setNotes] = useState('');
  const [testSheet, setTestSheet] = useState(null);
  const [currentTestSheet, setCurrentTestSheet] = useState(null); 
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
      if (open) {
          if (testToEdit) {
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
              setStatus(testToEdit.status || 'COMPLETED');
              setResult(testToEdit.result || 'Pass');
              setNotes(testToEdit.evaluator_notes || '');
              setVideoUrl(testToEdit.video_url || '');
              setCurrentTestSheet(testToEdit.test_sheet);
              setTestSheet(null); 
          } else {
              setTestType('Skills'); setIsCustomType(false); setTestName('');
              setTestDate(new Date().toISOString().split('T')[0]);
              setStatus('COMPLETED'); setResult('Pass'); setNotes('');
              setVideoUrl(''); setCurrentTestSheet(null); setTestSheet(null);
          }
      }
  }, [open, testToEdit]);

  const handleSave = async () => {
      // ... (Save logic same)
      setLoading(true);
      try {
          const formData = new FormData();
          formData.append('test_type', testType);
          formData.append('test_name', testName);
          formData.append('test_date', testDate || '');
          formData.append('status', status);
          formData.append('result', status === 'COMPLETED' ? result : '');
          formData.append('evaluator_notes', notes);
          formData.append('video_url', videoUrl);
          if (testSheet) formData.append('test_sheet', testSheet);

          if (testToEdit) await apiRequest(`/tests/${testToEdit.id}/`, 'PATCH', formData, token);
          else await apiRequest(`/skaters/${skater.id}/tests/`, 'POST', formData, token);
          
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to save test."); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
      // ... (Delete logic same)
      if(!confirm("Delete this record?")) return;
      setLoading(true);
      try {
          await apiRequest(`/tests/${testToEdit.id}/`, 'DELETE', null, token);
          if (onSaved) onSaved();
          setOpen(false);
      } catch (e) { alert("Failed to delete."); }
      finally { setLoading(false); }
  }

  // ... (File handler & preview same)
  const handleDeleteSheet = async () => {
      if (!confirm("Remove test sheet?")) return;
      setLoading(true);
      try {
          const formData = new FormData();
          formData.append('test_sheet', ''); 
          await apiRequest(`/tests/${testToEdit.id}/`, 'PATCH', formData, token);
          setCurrentTestSheet(null);
          if (onSaved) onSaved();
      } catch (e) { alert("Failed to remove file."); }
      finally { setLoading(false); }
  };

  const FilePreview = ({ url }) => {
      if (!url) return null;
      const filename = url.split('/').pop().split('?')[0];
      return (
          <div className="flex items-center justify-between mb-2 text-xs bg-blue-50 p-2 rounded border border-blue-100">
              <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline truncate" title={filename}>{filename}</a>
              </div>
              {!readOnly && (
                  <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600" onClick={handleDeleteSheet}><Trash2 className="h-3 w-3" /></Button>
              )}
          </div>
      );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> Log Test</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                {testToEdit ? 'Edit Test Record' : 'Log Test Result'}
                {readOnly && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><Lock className="h-3 w-3"/> View Only</span>}
            </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            {/* Inputs disabled if readOnly */}
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                    <Label>Category</Label>
                    {!isCustomType ? (
                        <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={testType} onChange={(e) => { if (e.target.value === 'CUSTOM') { setIsCustomType(true); setTestType(''); } else { setTestType(e.target.value); } }} disabled={readOnly}>
                            {DEFAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            <option value="CUSTOM">Other...</option>
                        </select>
                    ) : (
                        <div className="flex gap-1"><Input value={testType} onChange={(e) => setTestType(e.target.value)} placeholder="Custom..." className="h-9" autoFocus disabled={readOnly} /><Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setIsCustomType(false); setTestType('Skills'); }} disabled={readOnly}><ChevronLeft className="h-4 w-4" /></Button></div>
                    )}
                </div>
                <div className="col-span-2 space-y-2"><Label>Test Name</Label><Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Gold Skills" disabled={readOnly} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Status</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} disabled={readOnly}><option value="COMPLETED">Completed</option><option value="PLANNED">Planned</option><option value="SCHEDULED">Scheduled</option><option value="WITHDRAWN">Withdrawn</option></select></div>
                <div className="space-y-2"><Label>Date</Label><DatePicker date={testDate} setDate={setTestDate} placeholder="Select Date" disabled={readOnly} /></div>
            </div>

            {status === 'COMPLETED' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Result</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={result} onChange={(e) => setResult(e.target.value)} disabled={readOnly}><option value="Pass">Pass</option><option value="Honors">Pass with Honors</option><option value="Retry">Retry</option></select>
                </div>
            )}

            {/* --- FILES SECTION --- */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Test Sheet (PDF)</Label>
                    <FilePreview url={currentTestSheet} />
                    {!readOnly && <Input type="file" accept="application/pdf,image/*" className="h-9 text-xs" onChange={(e) => setTestSheet(e.target.files[0])} />}
                </div>
                <div className="space-y-2">
                    <Label>Video URL</Label>
                    <div className="relative">
                        <Video className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." disabled={readOnly} />
                    </div>
                </div>
            </div>

            <div className="space-y-2"><Label>Notes / Feedback</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Evaluator feedback..." disabled={readOnly} /></div>
            
            {/* FOOTER - HIDE IF READ ONLY */}
            {!readOnly && (
                <div className="flex justify-between pt-2">
                    {testToEdit && canDelete ? ( 
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete</Button>
                    ) : <div></div>}
                    <Button onClick={handleSave} disabled={loading} className={!testToEdit || !canDelete ? "w-full" : ""}>Save Record</Button>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}