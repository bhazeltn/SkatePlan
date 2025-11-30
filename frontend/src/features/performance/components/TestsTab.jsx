import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogTestModal } from '@/features/performance/components/LogTestModal';
import { ClipboardCheck, Calendar, Clock } from 'lucide-react';

export function TestsTab({ skater, readOnly, permissions }) { 
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

  // Permission Checks
  const canCreate = permissions?.canCreateCompetitions; 
  const canDelete = permissions?.canDelete; 
  const canEdit = permissions?.canEditCompetitions;

  if (loading) return <div className="p-8 text-center">Loading records...</div>;

  return (
    <div className="space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold">Test Records</h3>
            <p className="text-sm text-muted-foreground">Progress through levels</p>
        </div>
        {/* Only Coach can create */}
        {!readOnly && canCreate && <LogTestModal skater={skater} onSaved={fetchTests} />}
      </div>

      {/* --- PLANNED --- */}
      <div className="space-y-4">
         <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming / Planned</h4>
         {planned.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No tests planned.</p>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planned.map(test => (
                   <LogTestModal 
                       key={test.id} 
                       skater={skater} 
                       testToEdit={test} 
                       canDelete={canDelete} 
                       readOnly={!canEdit}
                       onSaved={fetchTests} 
                       trigger={
                           <Card className="border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-all h-full">
                               <CardContent className="p-4">
                                   <div className="flex items-center gap-3">
                                       <Clock className="h-5 w-5 text-indigo-500" />
                                       <div>
                                           <h4 className="font-bold text-gray-900">{test.test_name}</h4>
                                           <div className="flex items-center gap-2 text-sm text-gray-500">
                                               {test.test_date ? <><Calendar className="h-3 w-3" /> {test.test_date}</> : <span className="italic">Date TBD</span>}
                                               <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{test.status}</span>
                                           </div>
                                       </div>
                                   </div>
                               </CardContent>
                           </Card>
                       }
                   />
                ))}
             </div>
         )}
      </div>

      {/* --- HISTORY --- */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">History</h4>
        {history.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-slate-50">
                No test history.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((test) => (
                    <LogTestModal 
                        key={test.id} 
                        skater={skater} 
                        testToEdit={test} 
                        canDelete={canDelete}
                        readOnly={!canEdit}
                        onSaved={fetchTests} 
                        trigger={
                            <Card className="cursor-pointer hover:border-brand-blue hover:shadow-sm transition-all h-full">
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className={`p-2 rounded-full ${test.result === 'Retry' ? 'bg-red-50' : 'bg-green-50'}`}>
                                        <ClipboardCheck className={`h-5 w-5 ${test.result === 'Retry' ? 'text-red-600' : 'text-green-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{test.test_name}</h4>
                                        <div className="flex gap-2 text-sm text-gray-600 mt-1 mb-2">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase">{test.test_type}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${test.result === 'Retry' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {test.result}
                                            </span>
                                        </div>
                                        {test.test_date && (
                                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {test.test_date}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        }
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}