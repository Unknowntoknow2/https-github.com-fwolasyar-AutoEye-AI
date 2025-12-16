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
    // Normalize part strings for matching (e.g., "Front Bumper" -> "front_bumper")
    const issue = issues.find(i => {
        const raw = i.part.toLowerCase().replace(/ /g, '_');
        return raw.includes(partKey) || (partKey === 'wheel' && raw.includes('wheel'));
    });
    
    const isSelected = selectedPart === partKey;
    const isHovered = hoveredPart === partKey;
    
    let baseClass = 'fill-slate-800 stroke-slate-600';
    
    if (issue) {
        if (issue.severity === 'Critical') baseClass = 'fill-red-900/80 stroke-red-500 animate-pulse';
        else if (issue.severity === 'Severe') baseClass = 'fill-orange-900/80 stroke-orange-500';
        else if (issue.severity === 'Moderate') baseClass = 'fill-yellow-900/60 stroke-yellow-500';
        else baseClass = 'fill-indigo-900/60 stroke-indigo-500';
    }

    if (isSelected) return `${baseClass} stroke-[3] opacity-100 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`;
    if (isHovered) return `${baseClass} stroke-[2] opacity-90 cursor-pointer`;
    
    // If something else is selected, dim this one
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
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        {/* Chassis / Frame Outline */}
        <path 
            d="M50,120 C50,80 80,50 150,50 C220,50 250,80 250,120 L250,480 C250,520 220,550 150,550 C80,550 50,520 50,480 Z" 
            className="fill-slate-900 stroke-slate-700 stroke-[4]"
        />

        {/* --- PARTS MAPPING --- */}

        {/* Hood */}
        <path 
            d="M60,130 L240,130 L230,220 L70,220 Z" 
            className={`${getSeverityColor('hood')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('hood')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('hood')}
        />
        
        {/* Roof */}
        <path 
            d="M75,230 L225,230 L225,360 L75,360 Z" 
            className={`${getSeverityColor('roof')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('roof')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('roof')}
        />
        
        {/* Trunk */}
        <path 
            d="M70,370 L230,370 L240,480 L60,480 Z" 
            className={`${getSeverityColor('trunk')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('trunk')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('trunk')}
        />

        {/* Front Bumper */}
        <path 
            d="M50,120 C50,90 90,50 150,50 C210,50 250,90 250,120 L240,130 L60,130 Z" 
            className={`${getSeverityColor('front_bumper')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('front_bumper')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('front_bumper')}
        />

        {/* Rear Bumper */}
        <path 
            d="M60,480 L240,480 L250,480 C250,520 210,550 150,550 C90,550 50,520 50,480 Z" 
            className={`${getSeverityColor('rear_bumper')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('rear_bumper')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('rear_bumper')}
        />

        {/* Left Front Fender */}
        <path 
            d="M50,130 L60,130 L70,220 L50,220 Z" 
            className={`${getSeverityColor('left_fender')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('left_fender')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('left_fender')}
        />
        
        {/* Right Front Fender */}
        <path 
            d="M250,130 L240,130 L230,220 L250,220 Z" 
            className={`${getSeverityColor('right_fender')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('right_fender')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('right_fender')}
        />
        
        {/* Left Quarter Panel (Formerly Rear Fender) */}
        <path 
            d="M50,360 L60,400 L70,370 L50,360 Z"
            className={`${getSeverityColor('left_quarter_panel')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('left_quarter_panel')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('left_quarter_panel')}
        />
        
        {/* Right Quarter Panel */}
        <path 
            d="M250,360 L240,400 L230,370 L250,360 Z"
            className={`${getSeverityColor('right_quarter_panel')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('right_quarter_panel')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('right_quarter_panel')}
        />

        {/* Left Front Door */}
        <path 
            d="M50,225 L75,230 L75,300 L50,300 Z" 
            className={`${getSeverityColor('left_front_door')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('left_front_door')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('left_front_door')}
        />

        {/* Right Front Door */}
        <path 
            d="M250,225 L225,230 L225,300 L250,300 Z" 
            className={`${getSeverityColor('right_front_door')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('right_front_door')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('right_front_door')}
        />
        
        {/* Left Rear Door */}
        <path 
            d="M50,305 L75,305 L75,360 L50,360 Z" 
            className={`${getSeverityColor('left_rear_door')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('left_rear_door')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('left_rear_door')}
        />

        {/* Right Rear Door */}
        <path 
            d="M250,305 L225,305 L225,360 L250,360 Z" 
            className={`${getSeverityColor('right_rear_door')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('right_rear_door')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('right_rear_door')}
        />

        {/* Glass / Windshield */}
        <path 
            d="M70,220 L230,220 L225,230 L75,230 Z" 
            className={`${getSeverityColor('windshield')} transition-all duration-300 opacity-60 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('windshield')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('windshield')}
        />

        {/* Wheels */}
        <rect x="20" y="140" width="20" height="40" rx="5" className={`${getSeverityColor('wheel')} fill-slate-800 stroke-slate-500`} onClick={() => handleInteraction('wheel')} />
        <rect x="260" y="140" width="20" height="40" rx="5" className={`${getSeverityColor('wheel')} fill-slate-800 stroke-slate-500`} onClick={() => handleInteraction('wheel')} />
        <rect x="20" y="380" width="20" height="40" rx="5" className={`${getSeverityColor('wheel')} fill-slate-800 stroke-slate-500`} onClick={() => handleInteraction('wheel')} />
        <rect x="260" y="380" width="20" height="40" rx="5" className={`${getSeverityColor('wheel')} fill-slate-800 stroke-slate-500`} onClick={() => handleInteraction('wheel')} />

      </svg>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none opacity-70">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[8px] text-slate-400 font-mono">CRITICAL</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-[8px] text-slate-400 font-mono">SEVERE</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-[8px] text-slate-400 font-mono">MINOR</span>
         </div>
      </div>
    </div>
  );
};

export default VehicleSchematic;