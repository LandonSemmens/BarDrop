import React, { useState } from "react";
import {
  Play,
  Check,
  Clock,
  X,
  Plus,
  Dumbbell,
  History,
  Search,
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import {
  ExerciseCard,
  RestTimerModal,
  ExerciseSearchModal,
} from "../components/WorkoutComponents";
import PageHeader from "../components/PageHeader";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Workout({ setTab }: { setTab?: (t: string) => void }) {
  const {
    activeWorkout,
    exercises,
    startWorkout,
    endWorkout,
    discardWorkout,
    addExercise,
    routines,
    createCustomExercise,
    user,
  } = useWorkout();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [now, setNow] = useState(Date.now());

  const handleDiscard = async () => {
    if (user && activeWorkout) {
      try {
        await deleteDoc(
          doc(db, "users", user.uid, "activeState", "currentWorkout"),
        );
      } catch (e) {
        console.error("Error removing workout from db:", e);
      }
    }
    discardWorkout();
  };

  React.useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!activeWorkout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
          <Dumbbell className="w-12 h-12 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          Ready to Lift?
        </h2>
        <p className="text-gray-400 text-center mb-8 max-w-sm">
          Start an empty workout or choose from a template.
        </p>
        <button
          onClick={() => startWorkout("Evening Workout")}
          className="w-full max-w-md py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
        >
          <Play fill="currentColor" className="w-6 h-6" />
          Start Empty Workout
        </button>
      </div>
    );
  }

  const durationMs = Math.max(0, now - activeWorkout.startTime);
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);

  return (
    <div className="pb-32 px-4 animate-in fade-in md:max-w-4xl md:mx-auto">
      {/* Header */}
      <PageHeader
        title={
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeWorkout.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-green-400 font-mono mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {mins}:{secs.toString().padStart(2, "0")}
            </div>
            <button
              onClick={() => {
                const hasMetrics = activeWorkout.exercises.some((e) =>
                  e.sets.some((s) => s.completed || s.weight > 0 || s.reps > 0),
                );

                // Fix inverted discard confirmation bugs:
                // 1. Fresh Empty Workout (length === 0) or any tracking data -> show modal
                // 2. Fresh Routine duplicate (has exercises but no metrics) -> bypass modal completely
                if (hasMetrics || activeWorkout.exercises.length === 0) {
                  setShowCancelDialog(true);
                } else {
                  handleDiscard();
                }
              }}
              className="text-red-400/80 hover:text-red-400 text-xs font-semibold uppercase tracking-wider mt-2 bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Discard Workout
            </button>
          </div>
        }
        action={
          <button
            onClick={endWorkout}
            className="px-4 py-2 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/50 hover:bg-green-500/30 transition-colors"
          >
            Finish
          </button>
        }
      />

      {/* Exercises */}
      <div className="space-y-4 mt-2">
        {activeWorkout.exercises.map((workoutEx) => (
          <ExerciseCard key={workoutEx.id} exercise={workoutEx} />
        ))}
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={() => setShowAddMenu(true)}
          className="w-full py-4 bg-blue-600/20 text-blue-400 font-bold rounded-2xl shadow border border-blue-500/30 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Exercise
        </button>
      </div>

      <RestTimerModal />

      {showAddMenu && (
        <ExerciseSearchModal
          exercises={exercises}
          onClose={() => setShowAddMenu(false)}
          onSelectExercise={(ex) => {
            addExercise(ex);
            setShowAddMenu(false);
          }}
          onCreateCustomExercise={(name, bodyPart, category) => {
            createCustomExercise(name, bodyPart, category);
            // Don't close so they can see it added or search for it
          }}
        />
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2 text-center">
                Discard workout?
              </h2>
              <p className="text-gray-400 text-sm text-center mb-6">
                Are you sure you want to discard this workout? Any unsaved
                progress will be lost forever.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1 py-3 text-sm font-bold text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition"
                >
                  Keep Lifting
                </button>
                <button
                  onClick={async () => {
                    setShowCancelDialog(false);
                    await handleDiscard();
                  }}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-500 transition"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
