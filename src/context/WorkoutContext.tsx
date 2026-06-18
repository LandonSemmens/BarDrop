import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { idb, initDB } from "../idb";
import { defaultExercises } from "../data/exercises";
import {
  Workout,
  Exercise,
  Settings,
  WorkoutExercise,
  Set as WorkoutSet,
  Routine,
} from "../types";

interface WorkoutContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  activeWorkout: Workout | null;
  workoutHistory: Workout[];
  exercises: Exercise[];
  routines: Routine[];
  settings: Settings;
  startWorkout: (name: string, routine?: Routine) => void;
  endWorkout: () => void;
  discardWorkout: () => void;
  addExercise: (exercise: Exercise) => void;
  reorderExercises: (exerciseId: string, direction: "up" | "down") => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
  ) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  restTimer: number;
  isResting: boolean;
  skipRest: () => void;
  createCustomExercise: (
    name: string,
    bodyPart: string,
    category: Exercise["category"],
  ) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
}

const defaultSettings: Settings = {
  id: "user-settings",
  weightUnit: "kg",
  restTimerEnabled: true,
  defaultRestTime: 90,
  theme: "system",
  vibration: true,
  sound: true,
  barWeight: 20,
  showVisualPlateBreakdown: true,
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio Context for beep
  const playBeep = useCallback(() => {
    if (!settings.sound) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, [settings.sound]);

  // Vibrate
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (settings.vibration && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [settings.vibration],
  );

  // Rest Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsResting(false);
            playBeep();
            vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer, playBeep, vibrate]);

  // Sync with Firestore periodically if online
  useEffect(() => {
    const sync = async () => {
      if (!user || !navigator.onLine) return;

      const queue = await idb.getSyncQueue();
      for (const item of queue) {
        try {
          if (item.action === "put") {
            if (item.type === "feedPost") {
              // Wait, the new prompt says 'social_feed' collection uses addDoc.
              // So maybe feedPost is handled directly now instead of queue, or we update queue item.
              await setDoc(
                doc(db, "social_feed", item.payload.id),
                item.payload,
              );
            } else {
              const path =
                item.type === "workout"
                  ? "workouts"
                  : item.type === "exercise"
                    ? "exercises"
                    : item.type === "routine"
                      ? "routines"
                      : "settings";
              const id = item.payload.id;
              await setDoc(doc(db, "users", user.uid, path, id), item.payload, {
                merge: true,
              });
            }
          } else if (item.action === "delete") {
            if (item.type === "feedPost") {
              await deleteDoc(doc(db, "social_feed", item.payload.id));
            } else {
              const path =
                item.type === "workout"
                  ? "workouts"
                  : item.type === "exercise"
                    ? "exercises"
                    : item.type === "routine"
                      ? "routines"
                      : "settings";
              const id = item.payload.id;
              await deleteDoc(doc(db, "users", user.uid, path, id));
            }
          }
          await idb.clearSyncItem(item.id);
        } catch (e) {
          console.error("Sync error:", e);
        }
      }
    };

    const interval = setInterval(sync, 10000); // 10s sync
    window.addEventListener("online", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", sync);
    };
  }, [user]);

  // Load Initial Data unconditionally
  useEffect(() => {
    const loadLocalData = async () => {
      const localSettings = await idb.getSettings();
      if (localSettings) setSettings(localSettings);

      const localWorkouts = await idb.getWorkouts();
      setWorkoutHistory(localWorkouts.filter((w) => w.status === "completed"));
      const active = localWorkouts.find((w) => w.status === "active");
      if (active) setActiveWorkout(active);

      const localRoutines = await idb.getRoutines();
      setRoutines(localRoutines);

      let localExercises = await idb.getExercises();
      if (localExercises.length === 0) {
        localExercises = defaultExercises;
        for (const ex of localExercises) idb.saveExercise(ex);
      }
      setExercises(localExercises);
    };

    loadLocalData();

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Sync real-time settings if online
        const unsubscribeSettings = onSnapshot(
          doc(db, "users", u.uid, "settings", "user-settings"),
          (docSnap) => {
            if (docSnap.exists()) {
              const s = docSnap.data() as Settings;
              setSettings(s);
              idb.saveSettings(s);
            }
          },
        );
        return () => unsubscribeSettings();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      if (activeWorkout && "wakeLock" in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
        } catch (err: any) {
          console.warn(`Wake lock error: ${err.name}, ${err.message}`);
        }
      } else if (!activeWorkout && wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [activeWorkout]);

  const saveActiveWorkout = (workout: typeof activeWorkout) => {
    setActiveWorkout(workout);
    if (workout) {
      idb.saveWorkout(workout);
      if (user) {
        setDoc(
          doc(db, "users", user.uid, "activeState", "currentWorkout"),
          workout,
        ).catch(console.error);
      }
    }
  };

  const updateWorkoutState = (updater: (prev: Workout) => Workout) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      idb.saveWorkout(next).catch(console.error);
      return next;
    });
  };

  const startWorkout = (name: string, routine?: Routine) => {
    const newWorkout: Workout = {
      id: crypto.randomUUID(),
      name,
      startTime: Date.now(),
      exercises: routine ? JSON.parse(JSON.stringify(routine.exercises)) : [],
      volume: 0,
      userId: user?.uid || "guest",
      status: "active",
    };
    saveActiveWorkout(newWorkout);
  };

  const discardWorkout = () => {
    if (activeWorkout) {
      idb.deleteWorkout(activeWorkout.id).catch(console.error);
    }
    setActiveWorkout(null);
  };

  const endWorkout = () => {
    if (!activeWorkout) return;
    const completed: Workout = {
      ...activeWorkout,
      endTime: Date.now(),
      status: "completed",
    };
    saveActiveWorkout(null);
    setWorkoutHistory((prev) => [completed, ...prev]);
    idb.saveWorkout(completed);

    // Create Social Feed Post
    if (user) {
      const duration = completed.endTime! - completed.startTime;
      const volume = completed.exercises.reduce(
        (acc, ex) =>
          acc +
          ex.sets.reduce(
            (sAcc, s) => sAcc + (s.completed ? s.weight * s.reps : 0),
            0,
          ),
        0,
      );

      const feedPost = {
        id: crypto.randomUUID(),
        userId: user.uid,
        userName: user.displayName || "Lifter",
        workoutName: completed.name,
        duration,
        volume,
        likes: [],
        commentsCount: 0,
        timestamp: new Date(),
      };

      initDB().then((dbInst) => {
        dbInst.put("syncQueue", {
          id: crypto.randomUUID(),
          type: "feedPost",
          action: "put",
          payload: feedPost,
          timestamp: Date.now(),
        });
      });
    }
  };

  const addExercise = (exercise: Exercise) => {
    updateWorkoutState((prev) => {
      const newEx: WorkoutExercise = {
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        name: exercise.name,
        sets: [],
        order: prev.exercises.length,
      };
      return {
        ...prev,
        exercises: [...prev.exercises, newEx],
      };
    });
  };

  const reorderExercises = (
    workoutExerciseId: string,
    direction: "up" | "down",
  ) => {
    updateWorkoutState((prev) => {
      const exercisesCpy = [...prev.exercises];
      const idx = exercisesCpy.findIndex((e) => e.id === workoutExerciseId);
      if (idx < 0) return prev;
      if (direction === "up" && idx > 0) {
        [exercisesCpy[idx], exercisesCpy[idx - 1]] = [
          exercisesCpy[idx - 1],
          exercisesCpy[idx],
        ];
      } else if (direction === "down" && idx < exercisesCpy.length - 1) {
        [exercisesCpy[idx], exercisesCpy[idx + 1]] = [
          exercisesCpy[idx + 1],
          exercisesCpy[idx],
        ];
      }
      const reordered = exercisesCpy.map((e, i) => ({ ...e, order: i }));
      return { ...prev, exercises: reordered };
    });
  };

  const removeExercise = (workoutExerciseId: string) => {
    updateWorkoutState((prev) => {
      const filtered = prev.exercises.filter((e) => e.id !== workoutExerciseId);
      const reordered = filtered.map((e, i) => ({ ...e, order: i }));
      return { ...prev, exercises: reordered };
    });
  };

  const addSet = (workoutExerciseId: string) => {
    updateWorkoutState((prev) => {
      const newSet: WorkoutSet = {
        id: crypto.randomUUID(),
        weight: 0,
        reps: 0,
        completed: false,
        type: "normal",
      };
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.id === workoutExerciseId) {
            return { ...e, sets: [...e.sets, newSet] };
          }
          return e;
        }),
      };
    });
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
  ) => {
    updateWorkoutState((prev) => {
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.id === exerciseId) {
            return {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, ...updates } : s,
              ),
            };
          }
          return e;
        }),
      };
    });
  };

  const removeSet = (exerciseId: string, setId: string) => {
    updateWorkoutState((prev) => {
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.id === exerciseId) {
            return { ...e, sets: e.sets.filter((s) => s.id !== setId) };
          }
          return e;
        }),
      };
    });
  };

  const completeSet = (exerciseId: string, setId: string) => {
    let wasComplete = false;
    updateWorkoutState((prev) => {
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.id === exerciseId) {
            return {
              ...e,
              sets: e.sets.map((s) => {
                if (s.id === setId) {
                  wasComplete = s.completed;
                  return { ...s, completed: !s.completed };
                }
                return s;
              }),
            };
          }
          return e;
        }),
      };
    });

    if (!wasComplete && settings.restTimerEnabled) {
      setRestTimer(settings.defaultRestTime);
      setIsResting(true);
      vibrate(100);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
  };

  const createCustomExercise = (
    name: string,
    bodyPart: string,
    category: Exercise["category"],
  ) => {
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      bodyPart,
      primaryMuscle: bodyPart,
      category,
      userId: user?.uid || "guest",
    };
    setExercises((prev) => [...prev, exercise]);
    idb.saveExercise(exercise);
  };

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    idb.saveSettings(newSettings);
  };

  const saveRoutine = (routine: Routine) => {
    setRoutines((prev) => {
      const exists = prev.findIndex((r) => r.id === routine.id);
      let next = [...prev];
      if (exists >= 0) {
        next[exists] = routine;
      } else {
        next.push(routine);
      }
      return next;
    });
    idb.saveRoutine(routine);
  };

  const deleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    idb.deleteRoutine(id);
  };

  return (
    <WorkoutContext.Provider
      value={{
        user,
        setUser,
        activeWorkout,
        workoutHistory,
        exercises,
        routines,
        settings,
        startWorkout,
        endWorkout,
        discardWorkout,
        addExercise,
        reorderExercises,
        removeExercise,
        addSet,
        updateSet,
        removeSet,
        completeSet,
        restTimer,
        isResting,
        skipRest,
        createCustomExercise,
        updateSettings,
        saveRoutine,
        deleteRoutine,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be within WorkoutProvider");
  return ctx;
};
