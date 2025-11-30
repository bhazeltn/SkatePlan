import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Trash2, Plus, X, ArrowDown } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';
import { Switch } from '@/components/ui/switch';

export function ProgramElementRow({ index, element, onChange, onRemove, readOnly }) {
  const { token } = useAuth();
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);

  // Debounce timer
  const [typingTimeout, setTypingTimeout] = useState(0);

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

  const handleSearch = (query, compIndex) => {
      // 1. Update UI immediately
      const newComps = [...element.components];
      newComps[compIndex] = { ...newComps[compIndex], name: query };
      onChange(index, { ...element, components: newComps });

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
              
              // Map UI Type (JUMP/SPIN) to Database Type if needed
              // Assuming backend expects 'Jump', 'Spin', 'Step' (Title Case) or exact match
              // Let's try sending it as is, but often backend is case-sensitive
              let category = element.type.charAt(0) + element.type.slice(1).toLowerCase(); 
              if (element.type === 'CHOREO') category = 'Choreo'; // Adjust if needed
              
              const data = await apiRequest(`/elements/?search=${query}&category=${category}`, 'GET', null, token);
              
              // Client-side filter boost: Prioritize exact starts
              const sorted = data.sort((a, b) => {
                  const aStarts = a.abbreviation.toLowerCase().startsWith(query.toLowerCase());
                  const bStarts = b.abbreviation.toLowerCase().startsWith(query.toLowerCase());
                  if (aStarts && !bStarts) return -1;
                  if (!aStarts && bStarts) return 1;
                  return 0;
              });
              
              setSearchResults(sorted.slice(0, 10)); // Limit to top 10
          } catch (e) { console.error(e); }
      }, 300)); // 300ms delay
  };

  const selectElement = (el) => {
      const newComps = [...element.components];
      newComps[searchIndex] = { name: el.abbreviation, id: el.id };
      // Auto-fill Base Value if available
      const bv = el.base_value || ''; 
      
      onChange(index, { 
          ...element, 
          components: newComps,
          base_value: bv // You might want to handle combos (adding BVs) differently
      });
      
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

  // Close search on click outside (Basic implementation)
  useEffect(() => {
      const handleClick = () => setSearchResults([]);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={`flex items-center gap-2 p-2 border rounded bg-white text-sm relative ${element.is_second_half ? 'border-l-4 border-l-yellow-400' : ''}`} onClick={e => e.stopPropagation()}>
        
        <div className="text-gray-400 font-mono text-xs w-5 text-center">{index + 1}</div>

        <select 
            className="h-8 w-[70px] rounded border bg-slate-50 text-xs"
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
            {element.components.map((comp, i) => (
                <div key={i} className="relative flex items-center">
                    {i > 0 && <span className="text-gray-400 text-xs mr-1">+</span>}
                    
                    <div className="relative">
                        <Input 
                            className="h-8 w-20 font-bold uppercase text-xs px-1.5"
                            value={comp.name}
                            onChange={(e) => handleSearch(e.target.value, i)}
                            placeholder={i === 0 ? "Code" : "Combo"}
                            disabled={readOnly} 
                        />
                        {!readOnly && isSearching && searchIndex === i && searchResults.length > 0 && (
                            <div className="absolute top-9 left-0 w-64 bg-white border shadow-xl rounded-md z-50 max-h-48 overflow-y-auto">
                                {searchResults.map(res => (
                                    <div 
                                        key={res.id} 
                                        className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b last:border-0 flex justify-between" 
                                        onClick={() => selectElement(res)}
                                    >
                                        <span className="font-bold text-indigo-700">{res.abbreviation}</span> 
                                        <span className="text-gray-500 truncate ml-2">{res.element_name}</span>
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

        {element.type !== 'JUMP' && element.type !== 'CHOREO' && (
            <Input 
                className="h-8 w-10 text-center px-0 text-xs" 
                placeholder="Lvl" 
                value={element.level} 
                onChange={(e) => onChange(index, { ...element, level: e.target.value })}
                disabled={readOnly} 
            />
        )}

        {element.type === 'JUMP' && (
             <div className="flex items-center" title="Bonus (2nd Half)">
                <span className="text-[10px] text-gray-400 mr-1 font-bold">x1.1</span>
                <Switch 
                    className="scale-75" 
                    checked={element.is_second_half || false}
                    onCheckedChange={(c) => onChange(index, { ...element, is_second_half: c })}
                    disabled={readOnly} 
                />
             </div>
        )}

        <div className="w-16">
            <Input 
                className="h-8 text-right font-mono text-xs px-1" 
                placeholder="BV" 
                type="number"
                step="0.01"
                value={element.base_value}
                onChange={(e) => onChange(index, { ...element, base_value: e.target.value })}
                disabled={readOnly} 
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