import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogTestModal } from '@/components/dashboard/LogTestModal';
import { ClipboardCheck, Calendar, Edit2, Clock } from 'lucide-react';

export function TestsTab({ skater }) {
  const { token } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/skaters/${skater.id}/tests/`, 'GET', null, token);
      setTests(data || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (skater) fetchTests(); }, [skater, token]);

  const history = tests.filter(t => t.status === 'COMPLETED' || t.status === 'WITHDRAWN');
  const planned = tests.filter(t => t.status !== 'COMPLETED' && t.status !== 'WITHDRAWN');

  if (loading) return <div className="p-8 text-center">Loading records...</div>;

  return (
    <div className="space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Test Records</h3>
            <p className="text-sm text-muted-foreground">Progress through levels</p>
        </div>
        <LogTestModal skater={skater} onSaved={fetchTests} />
      </div>

      {/* --- PLANNED TESTS --- */}
      <div className="space-y-4">
         <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming / Planned</h4>
         {planned.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No tests planned.</p>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planned.map(test => (
                   <Card key={test.id} className="border-l-4 border-l-indigo-500 relative group">
                       <CardContent className="p-4">
                            {/* Edit Button */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <LogTestModal skater={skater} testToEdit={test} onSaved={fetchTests} trigger={<Button variant="ghost" size="icon" className="h-6 w-6"><Edit2 className="h-3 w-3" /></Button>} />
                            </div>

                           <div className="flex items-center gap-3">
                               <Clock className="h-5 w-5 text-indigo-500" />
                               <div>
                                   <h4 className="font-bold text-gray-900">{test.test_name}</h4>
                                   <div className="flex items-center gap-2 text-sm text-gray-500">
                                       {test.test_date ? (
                                           <><Calendar className="h-3 w-3" /> {test.test_date}</>
                                       ) : (
                                           <span className="italic">Date TBD</span>
                                       )}
                                       <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{test.status}</span>
                                   </div>
                               </div>
                           </div>
                       </CardContent>
                   </Card>
                ))}
             </div>
         )}
      </div>

      {/* --- HISTORY --- */}
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
            {history.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                    No test history.
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((test) => (
                        <div key={test.id} className="flex items-start gap-4 p-4 border rounded-lg hover:border-brand-blue transition-colors bg-white relative group">
                            
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <LogTestModal 
                                    skater={skater} 
                                    testToEdit={test} 
                                    onSaved={fetchTests}
                                    trigger={<Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>}
                                />
                            </div>

                            <div className={`p-3 rounded-full ${test.result === 'Retry' ? 'bg-red-50' : 'bg-green-50'}`}>
                                <ClipboardCheck className={`h-6 w-6 ${test.result === 'Retry' ? 'text-red-600' : 'text-green-600'}`} />
                            </div>

                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-900">{test.test_name}</h4>
                                <div className="flex gap-4 text-sm text-gray-600 mt-1 mb-2">
                                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {test.test_date}</div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${test.result === 'Retry' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {test.result}
                                    </span>
                                </div>
                                {test.evaluator_notes && <p className="text-sm text-gray-600 italic">"{test.evaluator_notes}"</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}