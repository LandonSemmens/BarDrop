import React, { useState, useEffect } from "react";
import {
  Plus,
  Play,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Dumbbell,
  X,
  Search,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useWorkout } from "../context/WorkoutContext";
import { Routine, Exercise, WorkoutExercise } from "../types";
import { ExerciseSearchModal } from "../components/WorkoutComponents";
import PageHeader from "../components/PageHeader";

export default function Routines({ setTab }: { setTab?: (t: string) => void }) {
  const {
    saveRoutine,
    deleteRoutine,
    startWorkout,
    exercises,
    user: currentUser,
  } = useWorkout();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    // Ensure we dynamically target the active authenticated session or fall back to the preview container user ID
    const currentUserId = currentUser?.uid || "preview_user_77";

    if (!currentUserId) {
      console.warn(
        "No active user found to bind routine sub-collection query listener.",
      );
      return;
    }

    console.log(
      `Binding routine listener to explicit path: /users/${currentUserId}/routines`,
    );

    // CRITICAL: Point exactly to the sub-collection path structure verified in the database
    const routinesRef = collection(db, "users", currentUserId, "routines");

    // Query orders documents by creation date descending
    const q = query(routinesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const routinesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Routine[];

        console.log(
          "Successfully fetched routines payload from sub-collection:",
          routinesList,
        );
        setRoutines(routinesList);
      },
      (error) => {
        console.error(
          "Routines sub-collection sync failure error details:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateRoutineOptimistic = async (routineInputData: any) => {
    // 1. Generate a temporary local tracking ID immediately
    const tempId = crypto.randomUUID();
    
    const newRoutinePayload = {
      id: tempId, // Temporary ID for React tracking and drag-and-drop loops
      title: routineInputData.title || routineInputData.name || "New Workout Routine",
      createdAt: routineInputData.createdAt || Date.now(),
      exercises: routineInputData.exercises || []
    };

    // 2. Update local UI state immediately to make it appear instantly
    setRoutines(prev => [newRoutinePayload as any, ...prev]);

    // 3. Fire the database write in the background asynchronously
    try {
      const currentUserId = currentUser?.uid || "preview_user_77";
      const routinesRef = collection(db, "users", currentUserId, "routines");
      
      await addDoc(routinesRef, {
        title: newRoutinePayload.title,
        createdAt: new Date(newRoutinePayload.createdAt),
        exercises: newRoutinePayload.exercises
      });
      
      console.log("Background write successful.");
    } catch (error) {
      console.error("Creation failed, rolling back UI state:", error);
      // Rollback fallback: remove the temporary item if the server completely fails
      setRoutines(prev => prev.filter(item => item.id !== tempId));
      alert("Failed to sync routine to cloud.");
    }
  };

  const handleUpdateRoutineOptimistic = async (routineInputData: any) => {
    // Optimistic update for modifying existing routines
    setRoutines(prev => prev.map(item => item.id === routineInputData.id ? { ...item, ...routineInputData, title: routineInputData.name || routineInputData.title } : item));

    try {
      const currentUserId = currentUser?.uid || "preview_user_77";
      const { id, isNew, ...updateData } = routineInputData;
      await setDoc(doc(db, "users", currentUserId, "routines", id), {
        title: updateData.name || updateData.title,
        createdAt: new Date(updateData.createdAt || Date.now()),
        exercises: updateData.exercises || []
      }, { merge: true });
    } catch (error) {
      console.error("Update failed:", error);
      // Let the snapshot revert it
    }
  };

  const handleDeleteRoutineOptimistic = async (routineId: string) => {
    if (!routineId) return;

    // 1. Force the layout element to vanish from the screen frame instantly
    setRoutines(prev => prev.filter(item => item.id !== routineId));
    setShowMenu(null);

    // 2. Execute background database cleanup without blocking the user thread
    try {
      const currentUserId = currentUser?.uid || "preview_user_77";
      await deleteDoc(doc(db, "users", currentUserId, "routines", routineId));
      console.log("Background deletion verified on server.");
    } catch (error) {
      console.error("Deletion sync rejected by backend. Rolling back:", error);
      alert("Could not remove routine from server. Refreshing list.");
    }
  };

  const createRoutine = () => {
    const newRoutine: Routine = {
      id: crypto.randomUUID(),
      name: "New Routine",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      exercises: [],
      isNew: true, // We can use this to track if it's entirely new
    } as any;
    // We do NOT save the routine shell immediately
    setEditingRoutine(newRoutine);
  };

  const duplicateRoutine = (routine: Routine) => {
    const duplicatedMenuData = {
      ...routine,
      title: `${routine.name || (routine as any).title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      exercises: JSON.parse(JSON.stringify(routine.exercises)),
    };
    handleCreateRoutineOptimistic(duplicatedMenuData);
    setShowMenu(null);
  };

  const handleDelete = (id: string) => {
    handleDeleteRoutineOptimistic(id);
  };

  if (editingRoutine) {
    return (
      <RoutineEditor
        routine={editingRoutine}
        onSave={(updated) => {
          if ((updated as any).isNew) {
            handleCreateRoutineOptimistic({ ...updated, updatedAt: Date.now() });
          } else {
            handleUpdateRoutineOptimistic({ ...updated, updatedAt: Date.now() });
          }
          setEditingRoutine(null);
        }}
        onCancel={() => {
          setEditingRoutine(null);
        }}
        exercises={exercises}
      />
    );
  }

  return (
    <div className="pb-32 px-4 animate-in fade-in text-white md:max-w-4xl md:mx-auto">
      <PageHeader
        title="Routines"
        action={
          <button
            onClick={createRoutine}
            className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto space-y-4">
        {routines.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardListIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">
              No routines yet. Create one to get started.
            </p>
          </div>
        ) : (
          routines.map((routine) => (
            <div
              key={routine.id || (routine as any)._id}
              className="bg-gray-800 rounded-xl p-4 shadow border border-gray-700"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">
                  {routine.name || (routine as any).title || "Untitled Routine"}
                </h3>
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowMenu(showMenu === routine.id ? null : routine.id)
                    }
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu === routine.id && (
                    <div className="absolute right-0 top-8 bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-40 z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setEditingRoutine(routine);
                          setShowMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-800 text-white border-b border-gray-800"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => duplicateRoutine(routine)}
                        className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-800 text-white border-b border-gray-800"
                      >
                        <Copy className="w-4 h-4" /> Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(routine.id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-800 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                {routine.exercises.length} exercises{" "}
                {routine.exercises.length > 0
                  ? `• ${routine.exercises.map((e) => e.name).join(", ")}`
                  : ""}
              </p>
              <button
                onClick={() => {
                  startWorkout(
                    routine.name ||
                      (routine as any).title ||
                      "Untitled Routine",
                    routine,
                  );
                  if (setTab) setTab("workout");
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition"
              >
                <Play fill="currentColor" className="w-4 h-4" /> Start Workout
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ClipboardListIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function RoutineEditor({
  routine,
  onSave,
  onCancel,
  exercises,
}: {
  routine: Routine;
  onSave: (r: Routine) => void;
  onCancel: () => void;
  exercises: Exercise[];
}) {
  const { createCustomExercise } = useWorkout();
  const [draft, setDraft] = useState<Routine>(routine);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ ...draft, name: e.target.value });
  };

  const addExerciseToRoutine = (ex: Exercise) => {
    const newEx: WorkoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: ex.id,
      name: ex.name,
      order: draft.exercises.length,
      sets: [
        {
          id: crypto.randomUUID(),
          weight: 0,
          reps: 0,
          completed: false,
          type: "normal",
        },
      ],
    };
    setDraft({ ...draft, exercises: [...draft.exercises, newEx] });
    setShowAddMenu(false);
  };

  const reorderExercise = (id: string, direction: "up" | "down") => {
    setDraft((prev) => {
      const exercisesCpy = [...prev.exercises];
      const idx = exercisesCpy.findIndex((e) => e.id === id);
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
      return {
        ...prev,
        exercises: exercisesCpy.map((e, index) => ({ ...e, order: index })),
      };
    });
  };

  const removeExercise = (id: string) => {
    setDraft((prev) => {
      const filtered = prev.exercises.filter((e) => e.id !== id);
      return {
        ...prev,
        exercises: filtered.map((e, index) => ({ ...e, order: index })),
      };
    });
  };

  const addSet = (workoutExId: string) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) =>
        e.id === workoutExId
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: crypto.randomUUID(),
                  weight: 0,
                  reps: 0,
                  completed: false,
                  type: "normal",
                },
              ],
            }
          : e,
      ),
    }));
  };

  const reorderSet = (
    workoutExId: string,
    setId: string,
    direction: "up" | "down",
  ) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) => {
        if (e.id === workoutExId) {
          const setsCpy = [...e.sets];
          const idx = setsCpy.findIndex((s) => s.id === setId);
          if (idx < 0) return e;
          if (direction === "up" && idx > 0) {
            [setsCpy[idx], setsCpy[idx - 1]] = [setsCpy[idx - 1], setsCpy[idx]];
          } else if (direction === "down" && idx < setsCpy.length - 1) {
            [setsCpy[idx], setsCpy[idx + 1]] = [setsCpy[idx + 1], setsCpy[idx]];
          }
          return { ...e, sets: setsCpy };
        }
        return e;
      }),
    }));
  };

  const removeSet = (workoutExId: string, setId: string) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) =>
        e.id === workoutExId
          ? {
              ...e,
              sets: e.sets.filter((s) => s.id !== setId),
            }
          : e,
      ),
    }));
  };

  const updateSet = (workoutExId: string, setId: string, updates: any) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) =>
        e.id === workoutExId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, ...updates } : s,
              ),
            }
          : e,
      ),
    }));
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-950 pb-32 overflow-y-auto animate-in slide-in-from-right">
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 p-4 pt-safe flex items-center justify-between">
        <button
          onClick={() => setShowCancelDialog(true)}
          className="text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <span className="font-bold text-white">Edit Routine</span>
        <button
          onClick={() => onSave(draft)}
          className="text-blue-400 font-bold hover:text-blue-300"
        >
          Save
        </button>
      </div>

      <div className="p-4 space-y-4">
        <label className="block">
          <span className="text-gray-400 text-sm mb-1 block">Routine Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={handleNameChange}
            className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700"
            placeholder="Routine name..."
          />
        </label>

        {draft.exercises.map((workoutEx, index) => (
          <div
            key={workoutEx.id}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700"
          >
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => reorderExercise(workoutEx.id, "up")}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => reorderExercise(workoutEx.id, "down")}
                    disabled={index === draft.exercises.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-white">{workoutEx.name}</h3>
              </div>
              <button
                onClick={() => removeExercise(workoutEx.id)}
                className="text-red-400 p-1"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-[2rem_2rem_2fr_2fr_3rem] gap-2 mb-2 text-xs text-gray-400 text-center uppercase tracking-wider">
              <div></div>
              <div>Set</div>
              <div>Target Wt</div>
              <div>Target Reps</div>
              <div></div>
            </div>

            {workoutEx.sets.map((set, setIndex) => (
              <div
                key={set.id}
                className="grid grid-cols-[2rem_2rem_2fr_2fr_3rem] gap-1 items-center mb-2"
              >
                <div className="flex flex-col items-center justify-center">
                  <button
                    onClick={() => reorderSet(workoutEx.id, set.id, "up")}
                    disabled={setIndex === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => reorderSet(workoutEx.id, set.id, "down")}
                    disabled={setIndex === workoutEx.sets.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-center font-bold text-gray-500">
                  {setIndex + 1}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={set.weight || ""}
                  onChange={(e) =>
                    updateSet(workoutEx.id, set.id, {
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-gray-700 rounded-lg p-2 text-center text-white w-full border border-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={set.reps || ""}
                  onChange={(e) =>
                    updateSet(workoutEx.id, set.id, {
                      reps: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-gray-700 rounded-lg p-2 text-center text-white w-full border border-gray-600 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                />
                <button
                  onClick={() => removeSet(workoutEx.id, set.id)}
                  className="text-gray-500 hover:text-red-400 mx-auto p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => addSet(workoutEx.id)}
              className="mt-2 w-full py-2 text-blue-400 flex items-center justify-center font-medium gap-1 hover:bg-gray-700/50 rounded-lg border border-transparent"
            >
              <Plus className="w-4 h-4" /> Add Set
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowAddMenu(true)}
          className="w-full py-4 border-2 border-dashed border-gray-700 rounded-xl text-blue-400 font-bold hover:border-gray-600 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Exercise
        </button>
      </div>

      {showAddMenu && (
        <ExerciseSearchModal
          exercises={exercises}
          onClose={() => setShowAddMenu(false)}
          onSelectExercise={addExerciseToRoutine}
          onCreateCustomExercise={(name, bodyPart, category) => {
            createCustomExercise(name, bodyPart, category);
          }}
        />
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2 text-center">
                Discard changes?
              </h2>
              <p className="text-gray-400 text-sm text-center mb-6">
                Are you sure you want to discard this routine? Any unsaved
                changes will be lost forever.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 py-3 text-sm font-bold text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-500 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
