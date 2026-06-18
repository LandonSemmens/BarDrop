import React, { useState, useRef } from 'react';
import { useMuscleRecovery, MuscleStatus, RecoveryData } from '../hooks/useMuscleRecovery';

const STATUS_COLORS: Record<MuscleStatus, string> = {
  Fatigued: '#ef4444', // red-500
  Recovering: '#f59e0b', // amber-500
  Recovered: '#10b981', // emerald-500
};

const EMPTY_COLOR = 'var(--color-gray-800)';

interface Props {
  className?: string;
}

export default function MuscleRecoveryMap({ className = '' }: Props) {
  const recoveryData = useMuscleRecovery();
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ transform: 'translate(-50%, -100%)', left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getColor = (muscle: string) => {
    const data = recoveryData[muscle.toLowerCase()];
    if (!data) return EMPTY_COLOR;
    return STATUS_COLORS[data.status] || EMPTY_COLOR;
  };

  const getOpacity = (muscle: string) => {
    const data = recoveryData[muscle.toLowerCase()];
    if (!data) return 0.2;
    if (data.status === 'Recovered') return 0.2;
    return 0.8;
  };

  const activeData: RecoveryData | null = activeMuscle ? recoveryData[activeMuscle.toLowerCase()] : null;

  const updateTooltipPosition = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let transformX = '-50%';
    let transformY = '-100%';
    let left = x;
    let top = y - 15;
    
    // Bounds checking
    if (x < 120) {
      transformX = '0%';
      left = x + 10;
    } else if (rect.width - x < 120) {
      transformX = '-100%';
      left = x - 10;
    }
    
    if (y < 150) {
       transformY = '0%';
       top = y + 15;
    }
    
    setMousePos({ x, y });
    setTooltipPos({ left, top, transform: `translate(${transformX}, ${transformY})` });
  };

  const handlePointerEnter = (e: React.PointerEvent, muscle: string) => {
    setActiveMuscle(muscle);
    updateTooltipPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    updateTooltipPosition(e);
  };

  const handlePointerLeave = () => {
    setActiveMuscle(null);
  };

  const SVGBodyPart = ({ id, name, children }: { id: string, name: string, children: React.ReactNode }) => (
    <g
      id={id}
      fill={getColor(name)}
      opacity={getOpacity(name)}
      className="transition-all duration-300 cursor-pointer hover:opacity-100 hover:stroke-white focus:outline-none"
      stroke="transparent"
      strokeWidth="2"
      strokeLinejoin="round"
      onPointerEnter={(e) => handlePointerEnter(e, name)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={(e) => handlePointerEnter(e, name)}
    >
      {children}
    </g>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex justify-center gap-10">
        
        {/* Front Map */}
        <div className="w-1/2 max-w-[200px] relative">
          <h3 className="text-center text-xs font-bold tracking-widest text-gray-500 mb-2 uppercase">Front</h3>
          <svg viewBox="0 0 200 400" className="w-full h-auto max-w-[200px] drop-shadow-lg">
            {/* Base Body Underlay */}
            <path className="fill-gray-900 stroke-gray-700" strokeWidth="1" d="M 100 10 C 115 10, 115 35, 105 42 L 125 50 C 140 52, 145 65, 145 75 C 145 85, 135 98, 132 105 C 142 120, 150 150, 150 160 C 150 170, 140 170, 140 160 L 128 125 L 122 145 C 135 185, 135 240, 125 260 L 120 270 C 132 295, 128 340, 122 355 C 120 370, 110 375, 105 360 L 101 270 L 100 170 L 99 270 L 95 360 C 90 375, 80 370, 78 355 C 72 340, 68 295, 80 270 L 75 260 C 65 240, 65 185, 78 145 L 72 125 L 60 160 C 60 170, 50 170, 50 160 C 50 150, 58 120, 68 105 C 65 98, 55 85, 55 75 C 55 65, 60 52, 75 50 L 95 42 C 85 35, 85 10, 100 10 Z" />

            <SVGBodyPart id="shoulders-f" name="Shoulders">
              <path d="M 76 52 C 60 52, 53 65, 57 78 C 62 88, 68 85, 72 75 C 75 68, 77 60, 76 52 Z" />
              <path d="M 124 52 C 140 52, 147 65, 143 78 C 138 88, 132 85, 128 75 C 125 68, 123 60, 124 52 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="chest" name="Chest">
              <path d="M 99 58 L 78 58 C 75 70, 75 80, 80 88 C 88 92, 95 92, 99 88 Z" />
              <path d="M 101 58 L 122 58 C 125 70, 125 80, 120 88 C 112 92, 105 92, 101 88 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="abs" name="Abs">
              <path d="M 86 92 L 114 92 C 112 110, 112 135, 108 145 L 92 145 C 88 135, 88 110, 86 92 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="obliques" name="Obliques">
              <path d="M 78 88 C 72 105, 75 135, 90 148 L 90 145 C 86 135, 84 110, 84 92 Z" />
              <path d="M 122 88 C 128 105, 125 135, 110 148 L 110 145 C 114 135, 116 110, 116 92 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="biceps" name="Biceps">
              <path d="M 70 78 C 62 85, 55 95, 58 105 C 62 118, 72 115, 75 100 C 78 90, 75 80, 70 78 Z" />
              <path d="M 130 78 C 138 85, 145 95, 142 105 C 138 118, 128 115, 125 100 C 122 90, 125 80, 130 78 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="forearms-f" name="Forearms">
              <path d="M 72 108 C 65 115, 50 145, 52 158 C 55 162, 60 162, 62 155 C 68 140, 78 120, 72 108 Z" />
              <path d="M 128 108 C 135 115, 150 145, 148 158 C 145 162, 140 162, 138 155 C 132 140, 122 120, 128 108 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="quads" name="Quads">
              <path d="M 98 172 L 78 148 C 68 185, 68 230, 76 255 C 85 260, 95 245, 98 232 Z" />
              <path d="M 102 172 L 122 148 C 132 185, 132 230, 124 255 C 115 260, 105 245, 102 232 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="calves-f" name="Calves">
              <path d="M 98 270 C 95 300, 90 330, 92 355 L 80 355 C 75 330, 68 300, 76 270 Z" />
              <path d="M 102 270 C 105 300, 110 330, 108 355 L 120 355 C 125 330, 132 300, 124 270 Z" />
            </SVGBodyPart>
          </svg>
        </div>

        {/* Back Map */}
        <div className="w-1/2 max-w-[200px] relative">
          <h3 className="text-center text-xs font-bold tracking-widest text-gray-500 mb-2 uppercase">Back</h3>
          <svg viewBox="0 0 200 400" className="w-full h-auto max-w-[200px] drop-shadow-lg">
            {/* Base Body Underlay */}
            <path className="fill-gray-900 stroke-gray-700" strokeWidth="1" d="M 100 10 C 115 10, 115 35, 105 42 L 125 50 C 140 52, 145 65, 145 75 C 145 85, 135 98, 132 105 C 142 120, 150 150, 150 160 C 150 170, 140 170, 140 160 L 128 125 L 122 145 C 135 185, 135 240, 125 260 L 120 270 C 132 295, 128 340, 122 355 C 120 370, 110 375, 105 360 L 101 270 L 100 170 L 99 270 L 95 360 C 90 375, 80 370, 78 355 C 72 340, 68 295, 80 270 L 75 260 C 65 240, 65 185, 78 145 L 72 125 L 60 160 C 60 170, 50 170, 50 160 C 50 150, 58 120, 68 105 C 65 98, 55 85, 55 75 C 55 65, 60 52, 75 50 L 95 42 C 85 35, 85 10, 100 10 Z" />

            <SVGBodyPart id="shoulders-b" name="Shoulders">
              <path d="M 76 52 C 60 52, 53 65, 57 78 C 62 88, 68 85, 72 75 C 75 68, 77 60, 76 52 Z" />
              <path d="M 124 52 C 140 52, 147 65, 143 78 C 138 88, 132 85, 128 75 C 125 68, 123 60, 124 52 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="back" name="Back">
              <path d="M 100 45 L 122 55 C 128 75, 128 100, 115 130 L 100 150 L 85 130 C 72 100, 72 75, 78 55 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="triceps" name="Triceps">
              <path d="M 72 75 C 65 85, 55 95, 58 110 C 62 120, 70 115, 75 100 C 78 90, 75 80, 72 75 Z" />
              <path d="M 128 75 C 135 85, 145 95, 142 110 C 138 120, 130 115, 125 100 C 122 90, 125 80, 128 75 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="forearms-b" name="Forearms">
              <path d="M 72 108 C 65 115, 50 145, 52 158 C 55 162, 60 162, 62 155 C 68 140, 78 120, 72 108 Z" />
              <path d="M 128 108 C 135 115, 150 145, 148 158 C 145 162, 140 162, 138 155 C 132 140, 122 120, 128 108 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="glutes" name="Glutes">
              <path d="M 100 150 L 78 148 C 68 165, 72 185, 95 190 L 100 190 Z" />
              <path d="M 100 150 L 122 148 C 132 165, 128 185, 105 190 L 100 190 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="hamstrings" name="Hamstrings">
              <path d="M 98 192 L 78 190 C 70 210, 70 240, 78 260 C 85 265, 95 255, 98 245 Z" />
              <path d="M 102 192 L 122 190 C 130 210, 130 240, 122 260 C 115 265, 105 255, 102 245 Z" />
            </SVGBodyPart>

            <SVGBodyPart id="calves-b" name="Calves">
              <path d="M 98 268 C 90 280, 70 300, 78 340 L 90 355 C 95 340, 98 300, 98 268 Z" />
              <path d="M 102 268 C 110 280, 130 300, 122 340 L 110 355 C 105 340, 102 300, 102 268 Z" />
            </SVGBodyPart>
          </svg>
        </div>

      </div>

      {activeMuscle && activeData && (
        <div 
          className="absolute z-50 pointer-events-none w-48 px-3 py-2 bg-gray-900/90 backdrop-blur-md border border-gray-700 shadow-xl opacity-95 rounded-xl animate-in fade-in zoom-in-95 duration-150"
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: tooltipPos.transform }}
        >
          <div className="flex items-center justify-between mb-1 gap-2">
             <span className="font-bold text-white tracking-wide truncate text-sm">{activeData.muscle}</span>
             <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${activeData.percentage < 50 ? 'bg-red-500/20 text-red-400' : activeData.percentage < 90 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
               {activeData.percentage}%
             </span>
          </div>
          
          <div className="text-xs text-gray-400 mb-3 font-medium flex items-center justify-between">
             {activeData.status === 'Recovered' 
               ? <span><span className="text-emerald-400 mr-1">🟢</span> Good to workout</span>
               : activeData.status === 'Fatigued'
                 ? <span><span className="text-red-400 mr-1">🔴</span> Rest Advised</span>
                 : <span><span className="text-amber-400 mr-1">🟡</span> Moderately fresh</span>
             }
          </div>

          <div className="relative w-full bg-gray-800 rounded-full h-2 mb-1.5 overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${activeData.percentage < 50 ? 'bg-red-500' : activeData.percentage < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${activeData.percentage}%` }}
            />
          </div>
          
          <div className="text-[10px] text-gray-500 font-mono text-right min-h-[14px]">
            {activeData.percentage < 100 ? (activeData.timeRemainingHrs > 0 ? `Ready in ${activeData.timeRemainingHrs}h` : 'Ready soon') : 'Fully Recovered'}
          </div>
        </div>
      )}
    </div>
  );
}
