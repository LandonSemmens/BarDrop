import React, { useState, useMemo } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { X, Dumbbell } from 'lucide-react';

const imperialPlates = [45, 35, 25, 10, 5, 2.5];
const metricPlates = [25, 20, 15, 10, 5, 2.5, 1.25];

export default function PlateCalculator({ 
  initialWeight = 0, 
  onClose,
  inline = false
}: { 
  initialWeight?: number, 
  onClose?: () => void,
  inline?: boolean
}) {
  const { settings } = useWorkout();
  const [targetWeight, setTargetWeight] = useState<string>(initialWeight > 0 ? String(initialWeight) : "");
  
  React.useEffect(() => {
    if (initialWeight > 0) {
      setTargetWeight(String(initialWeight));
    }
  }, [initialWeight]);

  const target = parseFloat(targetWeight) || 0;
  const barWeight = settings.barWeight;
  const isMetric = settings.weightUnit === 'kg';
  
  const platesAvailable = isMetric 
    ? (settings.availablePlatesKg ?? metricPlates)
    : (settings.availablePlatesLbs ?? imperialPlates);
  const unit = settings.weightUnit;
  
  const calculation = useMemo(() => {
    if (target <= barWeight) return { plates: [], remainder: 0 };
    
    let remainingPerSide = (target - barWeight) / 2;
    const platesUsed: { weight: number, count: number }[] = [];
    
    // Sort plates in descending order to strictly prioritize largest plates
    const sortedPlates = [...platesAvailable].sort((a, b) => b - a);
    
    for (const plate of sortedPlates) {
      if (remainingPerSide >= plate) {
        // Handle floating point imprecision
        // round to nearest 3 decimals before floor to avoid issues like 2.49999 / 2.5 = 0
        const factor = Math.round((remainingPerSide / plate) * 1000) / 1000;
        const count = Math.floor(factor);
        if (count > 0) {
          platesUsed.push({ weight: plate, count });
          remainingPerSide -= count * plate;
        }
      }
    }
    
    return {
      plates: platesUsed,
      remainder: remainingPerSide * 2 // total missing weight
    };
  }, [target, barWeight, platesAvailable]);
  
  const content = (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-black text-white tracking-widest uppercase mb-6 opacity-90 drop-shadow-md">Plate Calculator</h2>
        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">
          Target Weight ({settings.weightUnit})
        </label>
        <input 
          type="number"
          value={targetWeight}
          onChange={e => setTargetWeight(e.target.value)}
          className="w-full text-center text-5xl font-bold bg-transparent text-white border-b-2 border-gray-800 py-2 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          placeholder="0"
          autoFocus={!inline}
        />
      </div>
      
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-1 text-sm border-b border-gray-800 pb-3">
          <span className="text-gray-400">Bar Weight</span>
          <span className="font-mono font-medium text-white">{barWeight} {settings.weightUnit}</span>
        </div>
        
        {target > barWeight && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Per Side</h3>
            <div className="space-y-2">
              {calculation.plates.length > 0 ? calculation.plates.map(p => (
                <div key={p.weight} className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded-lg border border-gray-800">
                  <span className="font-mono font-bold text-lg text-blue-400">{p.weight}</span>
                  <span className="text-gray-400 font-bold font-mono">x {p.count}</span>
                </div>
              )) : (
                 <div className="text-center text-sm text-gray-500">Target matches bar weight!</div>
              )}
            </div>
            {calculation.remainder > 0 && (
              <div className="mt-4 text-xs text-orange-400 text-center tracking-wide font-medium bg-orange-500/10 py-2 rounded-lg border border-orange-500/20">
                Target missed by {calculation.remainder.toFixed(2)} {settings.weightUnit}
              </div>
            )}
          </div>
        )}
        {target > 0 && target <= barWeight && (
          <div className="mt-4 text-sm text-center text-yellow-500 italic pb-2">
            Target must be heavier than bar weight.
          </div>
        )}
      </div>
      
      {settings.showVisualPlateBreakdown && target > barWeight && calculation.plates.length > 0 && (
         <div className="mt-4 relative overflow-x-auto overflow-y-hidden border border-gray-800 rounded-2xl bg-gray-950 p-2 shadow-inner w-full custom-scrollbar">
            <div className="flex items-center justify-start h-32 relative min-w-max pr-8">
              {/* Bar */}
              <div className="h-5 w-[200%] bg-gray-700 absolute left-[-100%] z-0 rounded border border-gray-600 shadow-sm" />
              <div className="h-8 w-4 bg-gray-400 rounded-sm border border-gray-500 absolute left-[30px] z-0 shadow-md" />
              
              {/* Plates */}
              <div className="flex items-center absolute left-[50px] gap-[1px] z-10 drop-shadow-xl">
                {calculation.plates.flatMap(p => Array(p.count).fill(p.weight)).map((w, i) => {
                   let h = "h-4";
                   let color = "bg-gray-800";
                   if (w >= 45 || (w >= 25 && isMetric)) { h = "h-24 w-5"; color = "bg-red-600"; }
                   else if (w >= 35 || (w >= 20 && isMetric)) { h = "h-24 w-5 text-[10px]"; color = "bg-blue-600"; }
                   else if (w >= 25 || (w >= 15 && isMetric)) { h = "h-20 w-4"; color = "bg-yellow-500"; }
                   else if (w >= 10 && !isMetric) { h = "h-14 w-3"; color = "bg-green-600"; }
                   else if (w >= 10 && isMetric) { h = "h-16 w-3"; color = "bg-green-600"; }
                   else if (w >= 5) { h = "h-10 w-2"; color = "bg-gray-400"; }
                   else { h = "h-8 w-2"; color = "bg-gray-500"; }
                   
                   return <div key={i} className={`${h} ${color} rounded-[2px] border-x border-black/40 shadow-sm flex items-center justify-center shrink-0`} />
                })}
                <div className="h-6 w-3 bg-gray-400 rounded border border-gray-500 ml-1 shadow-md shrink-0" />
              </div>
            </div>
         </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl glass -mt-1 pt-2 shadow-inner">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-sm max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl custom-scrollbar">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
          <h2 className="font-bold flex items-center gap-2 text-white"><Dumbbell className="w-5 h-5"/> Plate Calculator</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
