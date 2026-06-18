export type WeightUnit = "kg" | "lbs";

export interface Set {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  type: "warmup" | "normal" | "failure" | "drop";
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: Set[];
  order: number;
}

export interface Workout {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  exercises: WorkoutExercise[];
  volume: number;
  userId: string;
  status: "active" | "completed";
}

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string; // Kept for backwards compatibility
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  category:
    | "barbell"
    | "dumbbell"
    | "machine"
    | "cable"
    | "bodyweight"
    | "weighted bodyweight"
    | "cardio"
    | "duration"
    | "time"
    | "distance"
    | "rep only";
  aliases?: string[];
  popular?: boolean;
  userId?: string; // If custom
}

export interface Routine {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  exercises: WorkoutExercise[];
}

export interface Settings {
  id: string; // 'user-settings'
  weightUnit: WeightUnit;
  restTimerEnabled: boolean;
  defaultRestTime: number; // in seconds
  theme: "dark" | "light" | "system";
  vibration: boolean;
  sound: boolean;
  barWeight: number;
  showVisualPlateBreakdown: boolean;
  statsLayoutOrder?: string[];
  calculatorsLayoutOrder?: string[];
  availablePlatesLbs?: number[];
  availablePlatesKg?: number[];
  barbellType?: string;
}
