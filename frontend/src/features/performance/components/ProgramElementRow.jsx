import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, X } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Switch } from '@/components/ui/switch';

export function ProgramElementRow({ index, element, onChange, onRemove, readOnly }) {
  const { token } = useAuth();
  
  // Ensure components exist and have base_value initialized
  const components = element.components || [{ name: element.name || '', id: null, base_value: 0 }];
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [typingTimeout, setTypingTimeout] = useState(0);

  // --- HELPER: Sum up all components + Apply Bonus ---
  const calculateTotalBV = (comps, isBonus) => {
      // Use provided isBonus or fall back to current state
      const bonusActive = isBonus !== undefined ? isBonus : element.is_second_half;

      let total = comps.reduce((sum, c) => sum + (parseFloat(c.base_value) || 0), 0);
      
      // Apply 1.1x multiplier for jumps in the second half
      if (bonusActive) {
          total *= 1.1;
      }

      return total > 0 ? total.toFixed(2) : '';
  };

  const handleTypeChange = (e) => {
      onChange(index, {
          ...element,
          type: e.target.value,
          components: [{ name: '', id: null, base_value: 0 }], // Reset components
          level: '',
          notes: '',
          base_value: '', // Reset total
          is_second_half: false
      });
  };

  const handleSearch = (query, compIndex) => {
      // 1. Update UI & Reset this component's BV (since name changed, old BV is invalid)
      const newComps = [...components];
      newComps[compIndex] = { ...newComps[compIndex], name: query, base_value: 0 };
      
      onChange(index, { 
          ...element, 
          components: newComps,
          base_value: calculateTotalBV(newComps) // Recalc total immediately
      });

      if (query.length < 1) { 
          setSearchResults([]); 
          setIsSearching(false); 
          return; 
      }

      // 2. Debounce API Call
      if (typingTimeout) clearTimeout(typingTimeout);

      setTypingTimeout(setTimeout(async () => {
          try {
              setSearchIndex(compIndex);
              setIsSearching(true);
              
              let category = element.type.charAt(0) + element.type.slice(1).toLowerCase(); 
              if (element.type === 'CHOREO') category = 'Choreo';
              
              const url = `/elements/?search=${query}&category=${category}&standard=true`;
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
      
      // Store individual BV on the component
      newComps[searchIndex] = { 
          name: el.abbreviation, 
          id: el.id,
          base_value: el.base_value || 0 
      };
      
      let newLevel = element.level;
      if (['STEP', 'CHOREO', 'SPIN'].includes(element.type)) {
          const match = el.abbreviation.match(/(\d+|B)$/); 
          if (match) newLevel = match[0];
      }
      
      onChange(index, { 
          ...element, 
          components: newComps,
          base_value: calculateTotalBV(newComps), // Auto-sum
          level: newLevel
      });
      
      setSearchResults([]);
      setIsSearching(false);
  };

  const addComboJump = () => {
      if (components.length < 3) {
          const newComps = [...components, { name: '', id: null, base_value: 0 }];
          onChange(index, { ...element, components: newComps });
      }
  };

  const removeComboJump = (i) => {
      const newComps = components.filter((_, idx) => idx !== i);
      onChange(index, { 
          ...element, 
          components: newComps,
          base_value: calculateTotalBV(newComps) // Recalc on removal
      });
  };

  // --- NEW: Handle Bonus Toggle ---
  const handleBonusToggle = (checked) => {
      // Recalculate BV passing the *new* checked state explicitly
      const newBV = calculateTotalBV(components, checked);
      onChange(index, { 
          ...element, 
          is_second_half: checked,
          base_value: newBV
      });
  };

  // Close search on click outside
  useEffect(() => {
      const handleClick = () => setSearchResults([]);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={`flex items-center gap-2 p-2 border rounded bg-white text-sm relative ${element.is_second_half ? 'border-l-4 border-l-yellow-400' : ''}`} onClick={e => e.stopPropagation()}>
        
        <div className="text-gray-400 font-mono text-xs w-5 text-center">{index + 1}</div>

        <select 
            className="h-8 w-[80px] rounded border bg-slate-50 text-xs font-medium"
            value={element.type}
            onChange={handleTypeChange}
            disabled={readOnly} 
        >
            <option value="JUMP">Jump</option>
            <option value="SPIN">Spin</option>
            <option value="STEP">Step</option>
            <option value="CHOREO">Choreo</option>
        </select>

        <div className="flex-1 flex flex-wrap items-center gap-1 min-w-[180px]">
            {components.map((comp, i) => (
                <div key={i} className="relative flex items-center">
                    {i > 0 && <span className="text-gray-400 text-xs mr-1">+</span>}
                    
                    <div className="relative">
                        <Input 
                            className="h-8 w-24 font-bold uppercase text-xs px-2"
                            value={comp.name}
                            onChange={(e) => handleSearch(e.target.value, i)}
                            placeholder={i === 0 ? "Element" : "Combo"}
                            disabled={readOnly} 
                        />
                        {!readOnly && isSearching && searchIndex === i && searchResults.length > 0 && (
                            <div className="absolute top-9 left-0 w-64 bg-white border shadow-xl rounded-md z-50 max-h-48 overflow-y-auto">
                                {searchResults.map(res => (
                                    <div 
                                        key={res.id} 
                                        className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b last:border-0 flex justify-between items-center" 
                                        onClick={() => selectElement(res)}
                                    >
                                        <div>
                                            <span className="font-bold text-indigo-700 block">{res.abbreviation}</span> 
                                            <span className="text-gray-500 text-[10px]">{res.element_name}</span>
                                        </div>
                                        <span className="font-mono text-gray-400">{res.base_value}</span>
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
            
            {!readOnly && element.type === 'JUMP' && components.length < 3 && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={addComboJump}>
                    <Plus className="h-3 w-3" />
                </Button>
            )}
        </div>

        {element.type === 'JUMP' && (
             <div className="flex items-center gap-1" title="Bonus (2nd Half)">
                <span className="text-[10px] text-gray-400 font-bold">x1.1</span>
                <Switch 
                    className="scale-75" 
                    checked={element.is_second_half || false}
                    onCheckedChange={handleBonusToggle} // Use our new handler
                    disabled={readOnly} 
                />
             </div>
        )}

        <div className="w-16">
            <Input 
                className="h-8 text-right font-mono text-xs px-1 bg-slate-50 text-gray-600 cursor-default" 
                placeholder="BV" 
                value={element.base_value}
                readOnly={true} // Locked to prevent manual errors
            />
        </div>

        {!readOnly && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => onRemove(index)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        )}
    </div>
  );
}