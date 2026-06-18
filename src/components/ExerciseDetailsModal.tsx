import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Dumbbell, History, TrendingUp, Calculator } from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import { Exercise, Workout, Set as WorkoutSet } from "../types";
import PlateCalculator from "./PlateCalculator";

// Brzycki 1RM formula
const calculate1RM = (weight: number, reps: number) => {
  if (reps === 0) return 0;
  return Math.round(weight * (36 / (37 - reps)));
};

export default function ExerciseDetailsModal({
  exercise,
  onClose
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const { workoutHistory, settings } = useWorkout();
  const [showPlateCalc, setShowPlateCalc] = useState(false);

  const stats = useMemo(() => {
    // Collect all sets of this exercise from completed workouts
    // Sorting oldest to newest for PR tracking
    const history = [...workoutHistory]
      .filter((w) => w.status === "completed")
      .sort((a, b) => (a.endTime || 0) - (b.endTime || 0))
      .map((w) => {
        const exItem = w.exercises.find((e) => e.exerciseId === exercise.id);
        return {
          date: w.endTime || 0,
          sets: exItem ? exItem.sets.filter((s) => s.completed) : [],
        };
      })
      .filter((item) => item.sets.length > 0);

    let allTimePR = 0;
    let allTimePRSet: WorkoutSet | null = null;
    let estimated1RM = 0;
    let previousPR = 0;
    let bestSetLastWorkout: WorkoutSet | null = null;

    let prHistory: number[] = [];

    history.forEach((session) => {
      let maxWeightThisSession = 0;
      let sessionBestSet: WorkoutSet | null = null;

      session.sets.forEach((set) => {
        // Track Best Set (Max Weight)
        if (set.weight > maxWeightThisSession) {
          maxWeightThisSession = set.weight;
          sessionBestSet = set;
        }

        // Track 1RM
        const oneRM = calculate1RM(set.weight, set.reps);
        if (oneRM > estimated1RM) {
          estimated1RM = oneRM;
        }

        if (set.weight > allTimePR) {
          if (allTimePR > 0) prHistory.push(allTimePR);
          allTimePR = set.weight;
          allTimePRSet = set;
        }
      });

      bestSetLastWorkout = sessionBestSet;
    });

    if (prHistory.length > 0) {
      previousPR = prHistory[prHistory.length - 1];
    }

    return {
      allTimePR,
      allTimePRSet,
      estimated1RM,
      previousPR,
      bestSetLastWorkout,
      historyContext: history.reverse() // Newest first for UI
    };
  }, [workoutHistory, exercise]);

  const changeSincePrevious = stats.allTimePR - stats.previousPR;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-3xl border-t border-gray-800 h-[85vh] flex flex-col animate-in slide-in-from-bottom">
        <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-gray-900 sticky top-0 z-10 rounded-t-3xl">
          <div>
             <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
             <span className="text-xs text-gray-500 uppercase tracking-wider">{exercise.primaryMuscle || exercise.bodyPart} • {exercise.category}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-full bg-gray-800 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-4 space-y-6 pb-20">
            {/* PR & 1RM Stats */}
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Personal Records
              </h3>
              <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-4 glass grid grid-cols-2 gap-4">
                 <div>
                    <span className="text-xs text-gray-500">Estimated 1RM</span>
                    <p className="text-2xl font-bold font-mono text-blue-400">{stats.estimated1RM} <span className="text-xs text-gray-500">{settings.weightUnit}</span></p>
                 </div>
                 <div>
                    <span className="text-xs text-gray-500">All-Time PR (Weight)</span>
                    <p className="text-2xl font-bold font-mono text-white">{stats.allTimePR} <span className="text-xs text-gray-500">{settings.weightUnit}</span></p>
                 </div>
                 <div className="col-span-2 border-t border-gray-700 pt-3 flex justify-between items-center">
                    <div>
                        <span className="text-xs text-gray-500 pb-1 block">Best Set Last Session</span>
                        {stats.bestSetLastWorkout ? (
                            <span className="font-mono text-sm bg-gray-900 px-2 py-1 rounded">
                               {stats.bestSetLastWorkout.weight} {settings.weightUnit} x {stats.bestSetLastWorkout.reps}
                            </span>
                        ) : (
                            <span className="text-sm text-gray-400">No data</span>
                        )}
                    </div>
                    {stats.previousPR > 0 && (
                        <div className="text-right">
                           <span className="text-xs text-gray-500 block">vs Previous PR</span>
                           <span className={`text-sm font-bold font-mono ${changeSincePrevious > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                             {changeSincePrevious > 0 ? '+' : ''}{changeSincePrevious}
                           </span>
                        </div>
                    )}
                 </div>
              </div>
              <div className="mt-3">
                 <button onClick={() => setShowPlateCalc(true)} className="w-full bg-blue-600/20 text-blue-400 py-3 rounded-xl border border-blue-500/20 flex justify-center items-center gap-2 font-medium">
                     <Calculator className="w-4 h-4" /> Open Plate Calculator
                 </button>
              </div>
            </section>

            {/* History Feed */}
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Exercise History
              </h3>
              {stats.historyContext.length > 0 ? (
                  <div className="space-y-3">
                     {stats.historyContext.slice(0, 5).map((session, i) => (
                        <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                           <div className="text-xs font-bold text-gray-400 mb-2">{new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</div>
                           <div className="grid grid-cols-2 gap-2 text-sm font-mono text-gray-300">
                               {session.sets.map((set, j) => (
                                   <div key={j} className="flex justify-between items-center bg-gray-900 px-2 py-1 rounded">
                                       <span>{set.weight} {settings.weightUnit}</span>
                                       <span className="text-gray-500">x {set.reps}</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                     ))}
                     {stats.historyContext.length > 5 && (
                        <div className="text-center text-xs text-gray-500 pt-2">Showing last 5 sessions</div>
                     )}
                  </div>
              ) : (
                  <div className="text-center py-6 text-gray-500 text-sm bg-gray-800/50 rounded-xl border border-gray-700/50">
                     No history found. Try logging a workout!
                  </div>
              )}
            </section>
        </div>
      </div>
      {showPlateCalc && createPortal(<PlateCalculator initialWeight={stats.allTimePR} onClose={() => setShowPlateCalc(false)} />, document.body)}
    </div>
  );
}
