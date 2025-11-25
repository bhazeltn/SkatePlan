import React from 'react';
import { Globe } from 'lucide-react';

export function FederationFlag({ federation, size = "h-4" }) {
    if (!federation || !federation.code) return <Globe className={`${size} w-auto text-gray-400`} />;

    // Map 3-letter ISU codes to 2-letter ISO codes for FlagCDN
    const codeMap = {
        'CAN': 'ca', 'USA': 'us', 'GBR': 'gb', 'FRA': 'fr', 'JPN': 'jp',
        'KOR': 'kr', 'CHN': 'cn', 'GER': 'de', 'ITA': 'it', 'RUS': 'ru',
        'ESP': 'es', 'AUS': 'au', 'AUT': 'at', 'BEL': 'be', 'BRA': 'br',
        'BUL': 'bg', 'CZE': 'cz', 'DEN': 'dk', 'EST': 'ee', 'FIN': 'fi',
        'GEO': 'ge', 'GRE': 'gr', 'HKG': 'hk', 'HUN': 'hu', 'ISL': 'is',
        'ISR': 'il', 'LAT': 'lv', 'LTU': 'lt', 'MEX': 'mx', 'NED': 'nl',
        'NOR': 'no', 'NZL': 'nz', 'PHI': 'ph', 'POL': 'pl', 'ROU': 'ro',
        'RSA': 'za', 'SGP': 'sg', 'SLO': 'si', 'SUI': 'ch', 'SVK': 'sk',
        'SWE': 'se', 'THA': 'th', 'TPE': 'tw', 'TUR': 'tr', 'UKR': 'ua',
        'ISU': 'un' // Use UN flag for generic ISU
    };

    const isoCode = codeMap[federation.code] || federation.code.slice(0, 2).toLowerCase();

    return (
        <div className="flex items-center gap-1.5" title={federation.name}>
            <img 
                src={`https://flagcdn.com/h20/${isoCode}.png`} 
                srcSet={`https://flagcdn.com/h40/${isoCode}.png 2x`}
                alt={federation.code} 
                className={`${size} w-auto object-contain rounded-sm shadow-sm`}
                onError={(e) => { e.target.style.display = 'none'; }} // Fallback if image fails
            />
            <span className="text-xs font-medium text-gray-700">{federation.code}</span>
        </div>
    );
}