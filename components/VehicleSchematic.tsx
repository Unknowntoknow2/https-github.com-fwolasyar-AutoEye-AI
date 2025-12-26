
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
        {/* Underbody / Main Hull Outline */}
        <path 
            d="M50,120 C50,80 80,50 150,50 C220,50 250,80 250,120 L250,480 C250,520 220,550 150,550 C80,550 50,520 50,480 Z" 
            className="fill-slate-900 stroke-slate-700 stroke-[4]"
        />

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
            d="M75,230 L225,230 L225,350 L75,350 Z" 
            className={`${getSeverityColor('roof')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('roof')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('roof')}
        />
        
        {/* Rear Glass (Adjuster v6.7) */}
        <path 
            d="M75,350 L225,350 L220,380 L80,380 Z" 
            className={`${getSeverityColor('rear_window')} transition-all duration-300 stroke-[1.5]`}
            onMouseEnter={() => setHoveredPart('rear_window')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('rear_window')}
        />

        {/* Trunk / Tailgate Assembly */}
        <path 
            d="M80,380 L220,380 L240,480 L60,480 Z" 
            className={`${getSeverityColor('trunk_tailgate')} transition-all duration-300 stroke-[1.5]`}
            onMouseEnter={() => setHoveredPart('trunk_tailgate')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('trunk_tailgate')}
        />

        {/* Front Bumper Area */}
        <path 
            d="M50,120 C50,90 90,50 150,50 C210,50 250,90 250,120 L240,130 L60,130 Z" 
            className={`${getSeverityColor('front_bumper')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('front_bumper')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('front_bumper')}
        />

        {/* Rear Bumper Area */}
        <path 
            d="M60,480 L240,480 L250,480 C250,520 210,550 150,550 C90,550 50,520 50,480 Z" 
            className={`${getSeverityColor('rear_bumper')} transition-all duration-300 stroke-[1]`}
            onMouseEnter={() => setHoveredPart('rear_bumper')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('rear_bumper')}
        />

        {/* Left Fender */}
        <path d="M50,130 L60,130 L70,220 L50,220 Z" className={`${getSeverityColor('left_fender')} transition-all`} onClick={() => handleInteraction('left_fender')} />
        {/* Right Fender */}
        <path d="M250,130 L240,130 L230,220 L250,220 Z" className={`${getSeverityColor('right_fender')} transition-all`} onClick={() => handleInteraction('right_fender')} />
        
        {/* Left Quarter Panel (The Critical Area for Adjusters) */}
        <path 
            d="M50,350 L50,480 L60,480 L80,380 Z"
            className={`${getSeverityColor('left_quarter_panel')} transition-all duration-300 stroke-[1.5]`}
            onMouseEnter={() => setHoveredPart('left_quarter_panel')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('left_quarter_panel')}
        />
        
        {/* Right Quarter Panel */}
        <path 
            d="M250,350 L250,480 L240,480 L220,380 Z"
            className={`${getSeverityColor('right_quarter_panel')} transition-all duration-300 stroke-[1.5]`}
            onMouseEnter={() => setHoveredPart('right_quarter_panel')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => handleInteraction('right_quarter_panel')}
        />

        {/* Detailed Side Panels / Doors */}
        <path d="M50,225 L75,230 L75,290 L50,290 Z" className={`${getSeverityColor('left_front_door')} transition-all`} onClick={() => handleInteraction('left_front_door')} />
        <path d="M250,225 L225,230 L225,290 L250,290 Z" className={`${getSeverityColor('right_front_door')} transition-all`} onClick={() => handleInteraction('right_front_door')} />
        <path d="M50,295 L75,295 L75,345 L50,345 Z" className={`${getSeverityColor('left_rear_door')} transition-all`} onClick={() => handleInteraction('left_rear_door')} />
        <path d="M250,295 L225,295 L225,345 L250,345 Z" className={`${getSeverityColor('right_rear_door')} transition-all`} onClick={() => handleInteraction('right_rear_door')} />

        {/* Pillars (Added for Structural Accuracy) */}
        <path d="M70,220 L75,230 L80,230 L75,220 Z" className={`${getSeverityColor('left_pillar')} opacity-40`} />
        <path d="M230,220 L225,230 L220,230 L225,220 Z" className={`${getSeverityColor('right_pillar')} opacity-40`} />

        {/* Front Windshield */}
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
      
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none opacity-70">
         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-[8px] text-slate-400 font-mono">CRITICAL</span></div>
         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[8px] text-slate-400 font-mono">SEVERE</span></div>
         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[8px] text-slate-400 font-mono">MINOR</span></div>
      </div>
    </div>
  );
};

export default VehicleSchematic;
