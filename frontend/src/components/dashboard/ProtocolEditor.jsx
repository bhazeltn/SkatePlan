import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

export function ProtocolEditor({ elements, onChange }) {
  // elements structure: [{ id: 1, name: '3Lz', bv: 5.9, goe: 0, score: 5.9, calls: '' }]

  const handleChange = (index, field, value) => {
      const updated = [...elements];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
  };

  const addRow = () => {
      onChange([...elements, { id: Date.now(), name: '', bv: '', goe: '', score: '', calls: '' }]);
  };

  const removeRow = (index) => {
      onChange(elements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1 border rounded bg-white p-2">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase px-2">
            <div className="col-span-3">Element</div>
            <div className="col-span-2 text-right">Base</div>
            <div className="col-span-2 text-right">GOE</div>
            <div className="col-span-2">Calls</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-1"></div>
        </div>

        <div className="space-y-1 max-h-[200px] overflow-y-auto px-1">
            {elements.map((el, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-1 rounded border border-slate-100">
                    <div className="col-span-3">
                        <Input className="h-6 text-xs font-medium px-1" value={el.name} onChange={(e) => handleChange(i, 'name', e.target.value)} placeholder="Ex: 3Lz" />
                    </div>
                    <div className="col-span-2">
                        <Input className="h-6 text-xs text-right px-1" type="number" step="0.01" value={el.bv} onChange={(e) => handleChange(i, 'bv', e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="col-span-2">
                        <Input className="h-6 text-xs text-right px-1" type="number" step="1" value={el.goe} onChange={(e) => handleChange(i, 'goe', e.target.value)} placeholder="+/-" />
                    </div>
                    <div className="col-span-2">
                        <Input className="h-6 text-xs text-red-600 px-1" value={el.calls} onChange={(e) => handleChange(i, 'calls', e.target.value)} placeholder="<" />
                    </div>
                    <div className="col-span-2">
                        <Input className="h-6 text-xs text-right font-bold text-brand-blue px-1" type="number" step="0.01" value={el.score} onChange={(e) => handleChange(i, 'score', e.target.value)} placeholder="Total" />
                    </div>
                    <div className="col-span-1 text-right">
                        <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => removeRow(i)}>
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={addRow}>
            <Plus className="h-3 w-3 mr-2" /> Add Element
        </Button>
    </div>
  );
}