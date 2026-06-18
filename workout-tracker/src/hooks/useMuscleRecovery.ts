import { useMemo } from 'react';
import { useWorkout } from '../context/WorkoutContext';
import { Workout, Exercise } from '../types';

export type MuscleStatus = 'Fatigued' | 'Recovering' | 'Recovered';

export interface RecoveryData {
  muscle: string;
  percentage: number;
  timeRemainingHrs: number;
  status: MuscleStatus;
}

const RECOVERY_TIME_MS = 48 * 60 * 60 * 1000; // 48 hours for full recovery

// standard list of muscles for the recovery map
const MUSCLES = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", 
  "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", 
  "Abs", "Obliques"
];

function determineMuscleGroup(ex: any, allExercises: Exercise[]): string {
  const p = ex.name.toLowerCase();
  const baseEx = allExercises.find(e => e.id === ex.exerciseId);
  const primaryMuscle = ex.primaryMuscle || baseEx?.primaryMuscle;
  const bodyPart = ex.bodyPart || baseEx?.bodyPart;
  
  let match = "Other";
  if (primaryMuscle) {
    match = primaryMuscle;
  } else if (bodyPart && bodyPart.toLowerCase() !== "other") {
    match = bodyPart;
  } else {
    if (p.includes("chest") || p.includes("bench press") || p.includes("fly") || p.includes("push up")) match = "Chest";
    else if (p.includes("back") || p.includes("pull up") || p.includes("row") || p.includes("lat") || p.includes("deadlift") && !p.includes("romanian")) match = "Back";
    else if (p.includes("shoulder") || p.includes("press") && !p.includes("bench") && !p.includes("leg") || p.includes("raise")) match = "Shoulders";
    else if (p.includes("bicep") || p.includes("curl") && !p.includes("leg")) match = "Biceps";
    else if (p.includes("tricep") || p.includes("skull") || p.includes("pushdown") || p.includes("dips")) match = "Triceps";
    else if (p.includes("forearm") || p.includes("wrist")) match = "Forearms";
    else if (p.includes("quad") || p.includes("squat") || p.includes("leg press") || p.includes("leg extension")) match = "Quads";
    else if (p.includes("hamstring") || p.includes("leg curl") || p.includes("romanian") || p.includes("stiff leg")) match = "Hamstrings";
    else if (p.includes("glute") || p.includes("hip thrust")) match = "Glutes";
    else if (p.includes("calf") || p.includes("calves")) match = "Calves";
    else if (p.includes("abs") || p.includes("crunch") || p.includes("sit up") || p.includes("leg raise") || p.includes("plank") && !p.includes("side")) match = "Abs";
    else if (p.includes("oblique") || p.includes("russian") || p.includes("woodchopper") || p.includes("side plank")) match = "Obliques";
  }
  return match;
}

export function useMuscleRecovery() {
  const { workoutHistory, exercises } = useWorkout();

  const recoveryMap = useMemo(() => {
    const now = Date.now();
    const lastWorkedTokens: Record<string, number> = {};

    MUSCLES.forEach(m => { lastWorkedTokens[m.toLowerCase()] = 0; });

    // Find the latest timestamp each muscle was worked
    workoutHistory.forEach(w => {
      // we'll use workout end time, or start time if end time is somehow missing
      const t = w.endTime || w.startTime;
      if (!t) return;

      if (!w.exercises) return;
      w.exercises.forEach(ex => {
        // Did they actually complete a set?
        const setsCount = ex.sets ? ex.sets.filter((s) => s.completed).length : 0;
        if (setsCount === 0) return;

        const group = determineMuscleGroup(ex, exercises).toLowerCase();
        if (lastWorkedTokens[group] !== undefined) {
          if (t > lastWorkedTokens[group]) {
            lastWorkedTokens[group] = t;
          }
        }
      });
    });

    const results: Record<string, RecoveryData> = {};

    MUSCLES.forEach(muscle => {
      const lastWorked = lastWorkedTokens[muscle.toLowerCase()];
      let percentage = 100;
      let timeRemainingHrs = 0;
      let status: MuscleStatus = 'Recovered';

      if (lastWorked > 0) {
        const elapsed = now - lastWorked;
        if (elapsed < RECOVERY_TIME_MS) {
          percentage = Math.max(0, Math.min(100, (elapsed / RECOVERY_TIME_MS) * 100));
          timeRemainingHrs = (RECOVERY_TIME_MS - elapsed) / (1000 * 60 * 60);

          if (percentage < 50) {
            status = 'Fatigued';
          } else if (percentage < 90) {
            status = 'Recovering';
          }
        }
      }

      results[muscle.toLowerCase()] = {
        muscle,
        percentage: Math.round(percentage),
        timeRemainingHrs: Math.ceil(timeRemainingHrs),
        status
      };
    });

    return results;
  }, [workoutHistory, exercises]);

  return recoveryMap;
}
