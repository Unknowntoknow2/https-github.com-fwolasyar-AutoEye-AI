
import React, { useState } from 'react';
import { CarIssue } from '../types';

interface VehicleSchematicProps {
  issues: CarIssue[];
  onPartClick?: (partKey: string) => void;
  selectedPart?: string | null;
}

const VehicleSchematic: React.FC<VehicleSchematicProps> = ({ issues, onPartClick, selectedPart }) => {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const getSeverityColor = (partKey: string) => {
    const issue = issues.find(i => {
        const raw = (i.part || '').toLowerCase().replace(/ /g, '_');
        // Handle side-specific and zone-specific logic
        if (partKey.includes('right')) return raw.includes(partKey) || (raw.includes('right') && raw.includes(partKey.replace('right_', '')));
        if (partKey.includes('left')) return raw.includes(partKey) || (raw.includes('left') && raw.includes(partKey.replace('left_', '')));
        return raw.includes(partKey);
    });
    
    const isSelected = selectedPart === partKey;
    const isHovered = hoveredPart === partKey;
    
    let baseClass = 'fill-slate-800 stroke-slate-600';
    
    if (issue) {
        if (issue.severity === 'Critical' || issue.severity === 'Severe') baseClass = 'fill-red-900/80 stroke-red-500 animate-pulse';
        else if (issue.severity === 'Moderate') baseClass = 'fill-orange-900/80 stroke-orange-500';
        else baseClass = 'fill-indigo-900/60 stroke-indigo-500';
    }

    if (isSelected) return `${baseClass} stroke-[3] opacity-100 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`;
    if (isHovered) return `${baseClass} stroke-[2] opacity-90 cursor-pointer`;
    if (selectedPart && !isSelected) return 'fill-slate-900/50 stroke-slate-800 opacity-40';

    return baseClass;
  };

  const handleInteraction = (partKey: string) => {
      if (onPartClick) onPartClick(partKey);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <svg 
        viewBox="0 0 300 600" 
        className="w-full h-full max-h-[500px] drop-shadow-2xl transition-all duration-500"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Main Hull Outline */}
        <path 
            d="M50,120 C50,80 80,50 150,50 C220,50 250,80 250,120 L250,480 C250,520 220,550 150,550 C80,550 50,520 50,480 Z" 
            className="fill-slate-900 stroke-slate-700 stroke-[4]"
        />

        {/* Side Mirror Assemblies */}
        <path d="M40,210 L50,215 L50,240 L40,235 Z" className={`${getSeverityColor('left_side_mirror')} transition-all`} onClick={() => handleInteraction('left_side_mirror')} />
        <path d="M260,210 L250,215 L250,240 L260,235 Z" className={`${getSeverityColor('right_side_mirror')} transition-all`} onClick={() => handleInteraction('right_side_mirror')} />

        {/* Tail Lamp Assemblies */}
        <path d="M60,490 L100,495 L100,510 L60,510 Z" className={`${getSeverityColor('left_tail_lamp')} transition-all`} onClick={() => handleInteraction('left_tail_lamp')} />
        <path d="M240,490 L200,495 L200,510 L240,510 Z" className={`${getSeverityColor('right_tail_lamp')} transition-all`} onClick={() => handleInteraction('right_tail_lamp')} />

        {/* Quarter Panels (The Rear Fenders) */}
        <path d="M50,300 L70,300 L70,480 L50,480 Z" className={`${getSeverityColor('left_quarter_panel')} transition-all`} onClick={() => handleInteraction('left_quarter_panel')} />
        <path d="M230,300 L250,300 L250,480 L230,480 Z" className={`${getSeverityColor('right_quarter_panel')} transition-all`} onClick={() => handleInteraction('right_quarter_panel')} />

        {/* Fog Lights */}
        <circle cx="85" cy="115" r="10" className={`${getSeverityColor('left_fog_light')} transition-all`} onClick={() => handleInteraction('left_fog_light')} />
        <circle cx="215" cy="115" r="10" className={`${getSeverityColor('right_fog_light')} transition-all`} onClick={() => handleInteraction('right_fog_light')} />

        {/* Hood */}
        <path d="M60,130 L240,130 L230,220 L70,220 Z" className={`${getSeverityColor('hood')} transition-all`} onClick={() => handleInteraction('hood')} />
        
        {/* Trunk Exterior */}
        <path d="M80,380 L220,380 L240,480 L60,480 Z" className={`${getSeverityColor('trunk')} transition-all`} onClick={() => handleInteraction('trunk')} />

        {/* Inner Trunk Cavity */}
        <rect x="100" y="400" width="100" height="50" rx="5" className={`${getSeverityColor('inner_trunk')} transition-all opacity-40`} onClick={() => handleInteraction('inner_trunk')} />

        {/* Front Bumper Section */}
        <path 
            d="M50,120 C50,90 90,50 150,50 C210,50 250,90 250,120 L240,130 L60,130 Z" 
            className={`${getSeverityColor('front_bumper')} transition-all`}
            onClick={() => handleInteraction('front_bumper')}
        />

        {/* Rear Bumper Sections */}
        <path 
            d="M50,480 L150,480 L150,550 C90,550 50,520 50,480 Z" 
            className={`${getSeverityColor('left_rear_bumper')} transition-all`}
            onClick={() => handleInteraction('left_rear_bumper')}
        />
        <path 
            d="M150,480 L250,480 C250,520 210,550 150,550 L150,480 Z" 
            className={`${getSeverityColor('right_rear_bumper')} transition-all`}
            onClick={() => handleInteraction('right_rear_bumper')}
        />
      </svg>
    </div>
  );
};

export default VehicleSchematic;
