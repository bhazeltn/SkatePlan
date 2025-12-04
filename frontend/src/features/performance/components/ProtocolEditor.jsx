import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProtocolElementRow } from './ProtocolElementRow';

export function ProtocolEditor({ elements, onChange, readOnly }) {
  
  const handleRowChange = (index, newData) => {
      const updated = [...elements];
      updated[index] = newData;
      onChange(updated);
  };

  const addRow = () => {
      onChange([
          ...elements, 
          { 
              id: Date.now(), 
              type: 'JUMP',
              components: [{ name: '', id: null, base_value: 0 }], 
              base_value: '', 
              goe: '', 
              score: '',
              is_second_half: false
          }
      ]);
  };

  const removeRow = (index) => {
      onChange(elements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1 border rounded bg-white p-2">
        {/* UPDATED HEADER GRID: 2 | 5 | 1 | 1 | 1 | 1 | 1 */}
        <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">
            <div className="col-span-2">Type</div>
            <div className="col-span-5">Element / Combo</div>
            <div className="col-span-1 text-center">Bonus</div>
            <div className="col-span-1 text-right">Base</div>
            <div className="col-span-1 text-right">GOE</div>
            <div className="col-span-1 text-right">Score</div>
            <div className="col-span-1"></div>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto px-1 pb-20"> 
            {elements.map((el, i) => (
                <ProtocolElementRow 
                    key={el.id || i} 
                    index={i} 
                    element={el} 
                    onChange={handleRowChange} 
                    onRemove={removeRow}
                    readOnly={readOnly}
                />
            ))}
            
            {elements.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-4 italic">
                    No elements logged yet. Click below to start.
                </div>
            )}
        </div>

        {!readOnly && (
            <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs mt-2" onClick={addRow}>
                <Plus className="h-3 w-3 mr-2" /> Add Element Row
            </Button>
        )}
    </div>
  );
}