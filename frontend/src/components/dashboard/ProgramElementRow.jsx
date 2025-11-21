import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Plus, X } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/AuthContext';

export function ProgramElementRow({ index, element, onChange, onRemove }) {
  const { token } = useAuth();
  
  // element structure: 
  // { 
  //   id: 123, 
  //   type: 'JUMP' | 'SPIN' | 'STEP'..., 
  //   components: [{ name: '3Lz', id: 5 }, { name: '3T', id: 10 }], // Array for combos
  //   level: '4', 
  //   notes: 'Difficult entry' 
  // }

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0); // Which sub-component are we editing?

  const handleTypeChange = (e) => {
      // Reset structure when type changes
      onChange(index, {
          ...element,
          type: e.target.value,
          components: [{ name: '', id: null }], // Reset to single component
          level: '',
          notes: ''
      });
  };

  const handleSearch = async (query, compIndex) => {
      // Update local UI immediately
      const newComps = [...element.components];
      newComps[compIndex] = { ...newComps[compIndex], name: query };
      onChange(index, { ...element, components: newComps });

      if (query.length < 2) {
          setSearchResults([]);
          return;
      }

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
    <div className="flex items-start gap-2 p-2 border rounded bg-white text-sm relative">
        {/* 1. Drag/Order Handle (Visual only for now) */}
        <div className="mt-2 text-gray-400 font-mono text-xs w-4">{index + 1}</div>

        {/* 2. Type Selector */}
        <select 
            className="h-8 w-20 rounded border bg-slate-50 text-xs"
            value={element.type}
            onChange={handleTypeChange}
        >
            <option value="JUMP">Jump</option>
            <option value="SPIN">Spin</option>
            <option value="STEP">Step</option>
            <option value="CHOREO">Choreo</option>
        </select>

        {/* 3. Element Input(s) - Handles Combos */}
        <div className="flex-1 flex flex-wrap items-center gap-1">
            {element.components.map((comp, i) => (
                <div key={i} className="relative flex items-center">
                    {i > 0 && <span className="text-gray-400 text-xs mr-1">+</span>}
                    
                    <div className="relative">
                        <Input 
                            className="h-8 w-20 font-bold uppercase"
                            value={comp.name}
                            onChange={(e) => handleSearch(e.target.value, i)}
                            placeholder={i === 0 ? "Element" : "Combo"}
                        />
                        {/* Dropdown Results */}
                        {isSearching && searchIndex === i && searchResults.length > 0 && (
                            <div className="absolute top-9 left-0 w-48 bg-white border shadow-lg rounded z-50 max-h-40 overflow-y-auto">
                                {searchResults.map(res => (
                                    <div 
                                        key={res.id} 
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-xs"
                                        onClick={() => selectElement(res)}
                                    >
                                        <span className="font-bold">{res.abbreviation}</span> - {res.element_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Remove Jump Button (only for combos) */}
                    {i > 0 && (
                        <button type="button" onClick={() => removeComboJump(i)} className="ml-1 text-gray-300 hover:text-red-500">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            ))}

            {/* Add Jump Button (Only for Jumps, max 3) */}
            {element.type === 'JUMP' && element.components.length < 3 && (
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={addComboJump}>
                    <Plus className="h-3 w-3" />
                </Button>
            )}
        </div>

        {/* 4. Level & Notes (Hidden for Jumps usually, but shown for Spins/Steps) */}
        {element.type !== 'JUMP' && element.type !== 'CHOREO' && (
            <div className="w-12">
                <Input 
                    className="h-8 text-center" 
                    placeholder="Lvl" 
                    value={element.level} 
                    onChange={(e) => onChange(index, { ...element, level: e.target.value })}
                />
            </div>
        )}

        {/* 5. Feature Notes */}
        <div className="w-1/3">
            <Input 
                className="h-8 text-xs text-gray-600" 
                placeholder={element.type === 'SPIN' ? "Features (e.g. 8 revs)" : "Notes..."}
                value={element.notes}
                onChange={(e) => onChange(index, { ...element, notes: e.target.value })}
            />
        </div>

        {/* 6. Delete Row */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
        </Button>
    </div>
  );
}