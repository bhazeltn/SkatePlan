import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, X } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Switch } from '@/components/ui/switch';

export function ProtocolElementRow({ index, element, onChange, onRemove, readOnly }) {
  const { token } = useAuth();
  const searchRef = useRef(null);
  
  const components = element.components || [{ name: element.name || '', id: null, base_value: 0 }];
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [typingTimeout, setTypingTimeout] = useState(0);

  // --- MATH HELPER ---
  const calculateValues = (comps, isBonus, currentGOE) => {
      const bonusActive = isBonus !== undefined ? isBonus : element.is_second_half;
      let bv = comps.reduce((sum, c) => sum + (parseFloat(c.base_value) || 0), 0);
      
      if (bonusActive) bv *= 1.1;

      const finalBV = parseFloat(bv.toFixed(2));
      const goeVal = parseFloat(currentGOE) || 0;
      
      return {
          base_value: finalBV.toFixed(2),
          score: (finalBV + goeVal).toFixed(2)
      };
  };

  const updateElement = (updates) => {
      const merged = { ...element, ...updates };
      const math = calculateValues(
          merged.components, 
          merged.is_second_half, 
          merged.goe
      );
      onChange(index, { ...merged, ...math });
  };

  const handleTypeChange = (e) => {
      updateElement({
          type: e.target.value,
          components: [{ name: '', id: null, base_value: 0 }],
          is_second_half: false,
          goe: ''
      });
  };

  const handleSearch = (query, compIndex) => {
      const newComps = [...components];
      newComps[compIndex] = { ...newComps[compIndex], name: query, base_value: 0 };
      
      updateElement({ components: newComps });

      if (query.length < 1) { 
          setSearchResults([]); 
          setIsSearching(false); 
          return; 
      }

      if (typingTimeout) clearTimeout(typingTimeout);

      setTypingTimeout(setTimeout(async () => {
          try {
              setSearchIndex(compIndex);
              setIsSearching(true);
              
              const url = `/elements/?search=${query}`;
              const data = await apiRequest(url, 'GET', null, token);
              
              const sorted = data.sort((a, b) => {
                  const aStarts = a.abbreviation.toLowerCase().startsWith(query.toLowerCase());
                  const bStarts = b.abbreviation.toLowerCase().startsWith(query.toLowerCase());
                  if (aStarts && !bStarts) return -1;
                  if (!aStarts && bStarts) return 1;
                  return 0;
              });
              
              setSearchResults(sorted.slice(0, 10));
          } catch (e) { console.error(e); }
      }, 300));
  };

  const selectElement = (el) => {
      const newComps = [...components];
      newComps[searchIndex] = { 
          name: el.abbreviation, 
          id: el.id,
          base_value: el.base_value || 0 
      };
      
      updateElement({ components: newComps });
      setSearchResults([]);
      setIsSearching(false);
  };

  const addComboJump = () => {
      if (components.length < 3) {
          updateElement({ components: [...components, { name: '', id: null, base_value: 0 }] });
      }
  };

  const removeComboJump = (i) => {
      updateElement({ components: components.filter((_, idx) => idx !== i) });
  };

  useEffect(() => {
      const handleClick = (e) => {
          if (searchRef.current && !searchRef.current.contains(e.target)) {
              setSearchResults([]);
          }
      };
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={`grid grid-cols-12 gap-1 p-2 border rounded bg-white text-sm items-center relative ${element.is_second_half ? 'border-l-4 border-l-yellow-400' : ''}`} onClick={e => e.stopPropagation()} ref={searchRef}>
        
        {/* 1. TYPE (Col 1-2) */}
        <div className="col-span-2 flex gap-1 items-center">
            <div className="text-gray-400 font-mono text-xs w-4 text-center">{index + 1}</div>
            <select 
                className="h-8 w-full rounded border bg-slate-50 text-xs font-medium px-1"
                value={element.type || 'JUMP'}
                onChange={handleTypeChange}
                disabled={readOnly} 
            >
                <option value="JUMP">Jump</option>
                <option value="SPIN">Spin</option>
                <option value="STEP">Step</option>
                <option value="CHOREO">Choreo</option>
            </select>
        </div>

        {/* 2. ELEMENT BUILDER (Col 3-7) -> Increased to 5 columns */}
        <div className="col-span-5 flex flex-wrap items-center gap-1">
            {components.map((comp, i) => (
                <div key={i} className="relative flex items-center">
                    {i > 0 && <span className="text-gray-400 text-xs mr-0.5">+</span>}
                    <div className="relative">
                        <Input 
                            className="h-8 w-16 focus:w-24 transition-all duration-200 font-bold uppercase text-xs px-1.5"
                            value={comp.name}
                            onChange={(e) => handleSearch(e.target.value, i)}
                            placeholder="Code"
                            disabled={readOnly} 
                        />
                        {!readOnly && isSearching && searchIndex === i && searchResults.length > 0 && (
                            <div className="absolute top-9 left-0 w-64 bg-white border shadow-xl rounded-md z-[100] max-h-48 overflow-y-auto">
                                {searchResults.map(res => (
                                    <div 
                                        key={res.id} 
                                        className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b flex justify-between items-center" 
                                        onClick={() => selectElement(res)}
                                    >
                                        <span className="font-bold text-indigo-700">{res.abbreviation}</span>
                                        <span className="text-gray-400 font-mono">{res.base_value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {!readOnly && i > 0 && (
                        <button onClick={() => removeComboJump(i)} className="ml-0.5 text-gray-300 hover:text-red-500"><X className="h-3 w-3" /></button>
                    )}
                </div>
            ))}
            {!readOnly && element.type === 'JUMP' && components.length < 3 && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={addComboJump}>
                    <Plus className="h-3 w-3" />
                </Button>
            )}
        </div>

        {/* 3. BONUS (Col 8) */}
        <div className="col-span-1 flex justify-center">
            {element.type === 'JUMP' && (
                <div className="flex flex-col items-center justify-center">
                    <span className="text-[8px] text-gray-400 font-bold leading-none mb-0.5">x1.1</span>
                    <Switch 
                        className="scale-75 origin-center" 
                        checked={element.is_second_half || false}
                        onCheckedChange={(c) => updateElement({ is_second_half: c })}
                        disabled={readOnly} 
                    />
                </div>
            )}
        </div>

        {/* 4. BASE VALUE (Col 9) */}
        <div className="col-span-1">
            <Input 
                className="h-8 text-right font-mono text-xs px-1 bg-slate-50 text-gray-600" 
                placeholder="BV" 
                value={element.base_value}
                readOnly 
            />
        </div>

        {/* 5. GOE (Col 10) */}
        <div className="col-span-1">
            <Input 
                className="h-8 text-right font-mono text-xs px-1 border-blue-200" 
                placeholder="+/-" 
                type="number"
                step="0.01"
                value={element.goe}
                onChange={(e) => updateElement({ goe: e.target.value })}
                disabled={readOnly} 
            />
        </div>

        {/* 6. SCORE (Col 11) */}
        <div className="col-span-1">
            <Input 
                className="h-8 text-right font-bold text-xs px-1 bg-blue-50 text-brand-blue border-blue-100" 
                placeholder="Tot" 
                value={element.score}
                readOnly 
            />
        </div>

        {/* 7. DELETE (Col 12) */}
        <div className="col-span-1 text-right">
            {!readOnly && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => onRemove(index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    </div>
  );
}