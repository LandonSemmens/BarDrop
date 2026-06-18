import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Workout, Exercise, Settings, Routine } from "./types";

interface BarDropDB extends DBSchema {
  workouts: {
    key: string;
    value: Workout;
    indexes: { "by-date": number };
  };
  routines: {
    key: string;
    value: Routine;
  };
  exercises: {
    key: string;
    value: Exercise;
  };
  settings: {
    key: string;
    value: Settings;
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      type: "workout" | "exercise" | "settings" | "feedPost" | "routine";
      action: "put" | "delete";
      payload: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BarDropDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<BarDropDB>("bardrop-db", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workouts")) {
          const workoutStore = db.createObjectStore("workouts", {
            keyPath: "id",
          });
          workoutStore.createIndex("by-date", "startTime");
        }
        if (!db.objectStoreNames.contains("routines")) {
          db.createObjectStore("routines", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("exercises")) {
          db.createObjectStore("exercises", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id" }); // id can be a uuid
        }
      },
    });
  }
  return dbPromise;
};

export const idb = {
  async getWorkouts() {
    const db = await initDB();
    return db.getAllFromIndex("workouts", "by-date");
  },
  async saveWorkout(workout: Workout) {
    const db = await initDB();
    await db.put("workouts", workout);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "workout",
      action: "put",
      payload: workout,
      timestamp: Date.now(),
    });
  },
  async deleteWorkout(id: string) {
    const db = await initDB();
    await db.delete("workouts", id);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "workout",
      action: "delete",
      payload: { id },
      timestamp: Date.now(),
    });
  },
  async getExercises() {
    const db = await initDB();
    return db.getAll("exercises");
  },
  async getRoutines() {
    const db = await initDB();
    return db.getAll("routines");
  },
  async saveRoutine(routine: Routine) {
    const db = await initDB();
    await db.put("routines", routine);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "routine",
      action: "put",
      payload: routine,
      timestamp: Date.now(),
    });
  },
  async deleteRoutine(id: string) {
    const db = await initDB();
    await db.delete("routines", id);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "routine",
      action: "delete",
      payload: { id },
      timestamp: Date.now(),
    });
  },
  async saveExercise(exercise: Exercise) {
    const db = await initDB();
    await db.put("exercises", exercise);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "exercise",
      action: "put",
      payload: exercise,
      timestamp: Date.now(),
    });
  },
  async getSettings() {
    const db = await initDB();
    return db.get("settings", "user-settings");
  },
  async saveSettings(settings: Settings) {
    const db = await initDB();
    await db.put("settings", settings);
    await db.put("syncQueue", {
      id: crypto.randomUUID(),
      type: "settings",
      action: "put",
      payload: settings,
      timestamp: Date.now(),
    });
  },
  async getSyncQueue() {
    const db = await initDB();
    return db.getAll("syncQueue");
  },
  async clearSyncItem(id: string) {
    const db = await initDB();
    await db.delete("syncQueue", id);
  },
};
