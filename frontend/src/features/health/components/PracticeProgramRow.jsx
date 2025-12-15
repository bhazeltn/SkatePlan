import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { apiRequest } from '@/api';
import { useAuth } from '@/features/auth/AuthContext';

export function PracticeProgramRow({ index, element, onChange, onRemove }) {
    const { token } = useAuth();
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isAutoFetching, setIsAutoFetching] = useState(false);

    // --- 1. AUTO-CALCULATE SCORE ---
    // Runs whenever BV, GOE Grade, or Scale changes
    useEffect(() => {
        const bv = parseFloat(element.base_value || 0);
        let goePoints = 0;
        
        // Lookup GOE value from the stored scale if available
        if (element.goe_scale && element.goe_grade) {
            goePoints = parseFloat(element.goe_scale[element.goe_grade] || 0);
        }

        const total = (bv + goePoints).toFixed(2);
        
        // Only trigger update if score actually changed (prevents loops)
        if (total !== element.score) {
            onChange(index, { ...element, score: total });
        }
    }, [element.base_value, element.goe_grade, element.goe_scale]);

    // --- 2. AUTO-FETCH SCALE (The Logic You Requested) ---
    // Runs on mount if we have a name (from Program Plan) but no Scale data
    useEffect(() => {
        if (element.name && !element.goe_scale && !isAutoFetching) {
            const fetchScale = async () => {
                setIsAutoFetching(true);
                try {
                    const data = await apiRequest(`/elements/?search=${element.name}`, 'GET', null, token);
                    // Find exact match first, or fallback to first result
                    const match = data.find(e => e.abbreviation.toLowerCase() === element.name.toLowerCase()) || data[0];
                    
                    if (match) {
                        onChange(index, { 
                            ...element, 
                            base_value: match.base_value, // Ensure fresh BV
                            goe_scale: match.goe_scale    // HYDRATE THE SCALE
                        });
                    }
                } catch (e) { console.error("Failed to auto-fetch scale", e); }
                finally { setIsAutoFetching(false); }
            };
            fetchScale();
        }
    }, [element.name]); // Only run if name exists (and scale is missing check is inside)

    // --- 3. MANUAL SEARCH ---
    const handleSearch = async (query) => {
        // Clear scale if user starts typing a new name
        onChange(index, { ...element, name: query, goe_scale: null, base_value: 0 });
        
        if (query.length < 2) { setSearchResults([]); return; }
        
        try {
            setIsSearching(true);
            const data = await apiRequest(`/elements/?search=${query}`, 'GET', null, token);
            setSearchResults(data.slice(0, 5));
        } catch (e) { console.error(e); } 
        finally { setIsSearching(false); }
    };

    const selectElement = (el) => {
        onChange(index, {
            ...element,
            name: el.abbreviation,
            base_value: el.base_value,
            goe_scale: el.goe_scale, // Store scale for calculation
            goe_grade: '0'
        });
        setSearchResults([]);
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 border-b text-sm">
            {/* Element Name */}
            <div className="col-span-5 relative">
                <Input 
                    className="h-8 font-bold uppercase" 
                    value={element.name} 
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={isAutoFetching ? "Loading..." : "Element"}
                />
                {searchResults.length > 0 && (
                    <div className="absolute top-9 left-0 w-full bg-white border shadow-lg z-50 rounded max-h-40 overflow-y-auto">
                        {searchResults.map(res => (
                            <div 
                                key={res.id} 
                                className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between"
                                onClick={() => selectElement(res)}
                            >
                                <span className="font-bold">{res.abbreviation}</span>
                                <span className="text-gray-400">{res.base_value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Base Value */}
            <div className="col-span-2 text-right text-gray-500 font-mono text-xs pt-1">
                {element.base_value ? parseFloat(element.base_value).toFixed(2) : '-'}
            </div>

            {/* GOE Selector (-5 to +5) */}
            <div className="col-span-3">
                <select 
                    className="w-full h-8 border rounded text-center text-xs bg-slate-50"
                    value={element.goe_grade || '0'}
                    onChange={(e) => onChange(index, { ...element, goe_grade: e.target.value })}
                    disabled={!element.goe_scale} // Disable if we don't have math data yet
                >
                    <option value="5">+5</option>
                    <option value="4">+4</option>
                    <option value="3">+3</option>
                    <option value="2">+2</option>
                    <option value="1">+1</option>
                    <option value="0" className="text-gray-400">0</option>
                    <option value="-1">-1</option>
                    <option value="-2">-2</option>
                    <option value="-3">-3</option>
                    <option value="-4">-4</option>
                    <option value="-5">-5</option>
                </select>
            </div>

            {/* Total Score */}
            <div className="col-span-1 text-right font-bold text-blue-600 text-xs pt-1">
                {element.score}
            </div>

            {/* Remove */}
            <div className="col-span-1 text-right">
                <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-500">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}