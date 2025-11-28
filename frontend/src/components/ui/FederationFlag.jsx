import React from 'react';
import { Globe } from 'lucide-react';

export function FederationFlag({ federation, size = "h-4" }) {
    // Helper to extract ISO code (DB preferred, fallback to 2-letter slice)
    const getIso = () => {
        if (federation?.iso_code) return federation.iso_code.toLowerCase();
        if (federation?.code) return federation.code.slice(0, 2).toLowerCase();
        return null;
    };

    const isoCode = getIso();

    if (!isoCode) {
        return <Globe className={`${size} w-auto text-gray-400`} />;
    }

    // We use a fixed aspect ratio container to prevent jumping widths
    // w-6 (1.5rem/24px) is a good standard width for these flags
    return (
        <div className="flex items-center gap-2" title={federation.name}>
            <div className="relative w-6 h-4 shrink-0 overflow-hidden rounded-[2px] shadow-sm bg-slate-100 flex items-center justify-center">
                <img 
                    src={`https://flagcdn.com/h40/${isoCode}.png`}
                    srcSet={`https://flagcdn.com/h80/${isoCode}.png 2x`}
                    alt={federation.code}
                    className="w-full h-full object-cover" 
                />
            </div>
            <span className="text-xs font-medium text-gray-700 w-8">{federation.code}</span>
        </div>
    );
}