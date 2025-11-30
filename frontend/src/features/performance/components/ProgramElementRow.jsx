import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Trash2, Plus, X, ArrowDown } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Switch } from '@/components/ui/switch';

export function ProgramElementRow({ index, element, onChange, onRemove, readOnly }) { // <--- Added readOnly
  const { token } = useAuth();
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);

  const handleTypeChange = (e) => {
      onChange(index, {
          ...element,
          type: e.target.value,
          components: [{ name: '', id: null }],
          level: '',
          notes: '',
          base_value: '',
          is_second_half: false
      });
  };

  const handleSearch = async (query, compIndex) => {
      const newComps = [...element.components];
      newComps[compIndex] = { ...newComps[compIndex], name: query };
      onChange(index, { ...element, components: newComps });

      if (query.length < 2) { setSearchResults([]); return; }

      try {
          setSearchIndex(compIndex);
          setIsSearching(true);
          const data = await apiRequest(`/elements/?search=${query}&category=${element.type}`, 'GET', null, token);
          setSearchResults(data);
      } catch (e) { console.error(e); }
  };

  const selectElement = (el) => {
      const newComps = [...element.components];
      newComps[searchIndex] = { name: el.abbreviation, id: el.id };
      onChange(index, { ...element, components: newComps });
      setSearchResults([]);
      setIsSearching(false);
  };

  const addComboJump = () => {
      if (element.components.length < 3) {
          const newComps = [...element.components, { name: '', id: null }];
          onChange(index, { ...element, components: newComps });
      }
  };

  const removeComboJump = (i) => {
      const newComps = element.components.filter((_, idx) => idx !== i);
      onChange(index, { ...element, components: newComps });
  };

  return (
    <div className={`flex items-center gap-2 p-2 border rounded bg-white text-sm relative ${element.is_second_half ? 'border-l-4 border-l-yellow-400' : ''}`}>
        
        {/* 1. Drag Handle / Index */}
        <div className="text-gray-400 font-mono text-xs w-5 text-center">{index + 1}</div>

        {/* 2. Type Selector */}
        <select 
            className="h-8 w-[70px] rounded border bg-slate-50 text-xs"
            value={element.type}
            onChange={handleTypeChange}
            disabled={readOnly} // <--- Disabled
        >
            <option value="JUMP">Jump</option>
            <option value="SPIN">Spin</option>
            <option value="STEP">Step</option>
            <option value="CHOREO">Choreo</option>
        </select>

        {/* 3. Element Input(s) */}
        <div className="flex-1 flex flex-wrap items-center gap-1 min-w-[180px]">
            {element.components.map((comp, i) => (
                <div key={i} className="relative flex items-center">
                    {i > 0 && <span className="text-gray-400 text-xs mr-1">+</span>}
                    
                    <div className="relative">
                        <Input 
                            className="h-8 w-20 font-bold uppercase text-xs px-1.5"
                            value={comp.name}
                            onChange={(e) => handleSearch(e.target.value, i)}
                            placeholder={i === 0 ? "Code" : "Combo"}
                            disabled={readOnly} // <--- Disabled
                        />
                        {!readOnly && isSearching && searchIndex === i && searchResults.length > 0 && (
                            <div className="absolute top-9 left-0 w-48 bg-white border shadow-lg rounded z-50 max-h-40 overflow-y-auto">
                                {searchResults.map(res => (
                                    <div key={res.id} className="p-2 hover:bg-blue-50 cursor-pointer text-xs" onClick={() => selectElement(res)}>
                                        <span className="font-bold">{res.abbreviation}</span> - {res.element_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {!readOnly && i > 0 && (
                        <button type="button" onClick={() => removeComboJump(i)} className="ml-1 text-gray-300 hover:text-red-500"><X className="h-3 w-3" /></button>
                    )}
                </div>
            ))}
            {!readOnly && element.type === 'JUMP' && element.components.length < 3 && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={addComboJump}>
                    <Plus className="h-3 w-3" />
                </Button>
            )}
        </div>

        {/* 4. Level (Spins/Steps) */}
        {element.type !== 'JUMP' && element.type !== 'CHOREO' && (
            <Input 
                className="h-8 w-10 text-center px-0 text-xs" 
                placeholder="Lvl" 
                value={element.level} 
                onChange={(e) => onChange(index, { ...element, level: e.target.value })}
                disabled={readOnly} // <--- Disabled
            />
        )}

        {/* 5. 2nd Half Toggle (Jumps only) */}
        {element.type === 'JUMP' && (
             <div className="flex items-center" title="Bonus (2nd Half)">
                <span className="text-[10px] text-gray-400 mr-1 font-bold">x1.1</span>
                <Switch 
                    className="scale-75" 
                    checked={element.is_second_half || false}
                    onCheckedChange={(c) => onChange(index, { ...element, is_second_half: c })}
                    disabled={readOnly} // <--- Disabled
                />
             </div>
        )}

        {/* 6. Base Value Input */}
        <div className="w-16">
            <Input 
                className="h-8 text-right font-mono text-xs px-1" 
                placeholder="BV" 
                type="number"
                step="0.01"
                value={element.base_value}
                onChange={(e) => onChange(index, { ...element, base_value: e.target.value })}
                disabled={readOnly} // <--- Disabled
            />
        </div>

        {/* 7. Delete */}
        {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => onRemove(index)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        )}
    </div>
  );
}