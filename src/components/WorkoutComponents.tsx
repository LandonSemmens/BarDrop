import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Check,
  Clock,
  X,
  Plus,
  Dumbbell,
  GripVertical,
  Trash2,
  Search,
  Calculator,
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import { WorkoutExercise, Set as WorkoutSet, Exercise } from "../types";
import PlateCalculator from "./PlateCalculator";
import ExerciseDetailsModal from "./ExerciseDetailsModal";

export const RestTimerModal = () => {
  const { restTimer, isResting, skipRest } = useWorkout();

  if (!isResting) return null;

  const mins = Math.floor(restTimer / 60);
  const secs = restTimer % 60;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-700 glass flex items-center justify-between z-50 animate-in slide-in-from-bottom border-b-4 border-b-blue-600">
      <div className="flex items-center gap-3 text-blue-400">
        <Clock className="w-6 h-6 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Rest Timer
          </p>
          <p className="text-2xl font-mono font-bold text-white">
            {mins}:{secs.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
      <button
        onClick={skipRest}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
      >
        Skip
      </button>
    </div>
  );
};

export const ExerciseCard: React.FC<{ exercise: WorkoutExercise }> = ({ exercise }) => {
  const { updateSet, completeSet, addSet, removeSet, removeExercise, exercises } =
    useWorkout();
  
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // get max weight out of current sets to populate plate calc
  const maxWeight = exercise.sets.reduce((max, set) => Math.max(max, set.weight || 0), 0);
  
  // get base exercise
  const baseExercise = exercises.find(e => e.id === exercise.exerciseId) || {
     id: exercise.exerciseId,
     name: exercise.name,
     bodyPart: 'other',
     category: 'barbell'
  } as Exercise;

  return (
    <div className="bg-gray-800/80 rounded-2xl overflow-hidden glass mb-4 border border-gray-700/50">
      <div className="p-4 flex items-center justify-between border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <button className="text-gray-500 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5" />
          </button>
          <h3 
            onClick={() => setShowDetails(true)}
            className="font-bold text-lg text-white truncate max-w-[200px] cursor-pointer hover:underline decoration-gray-500 underline-offset-4"
          >
            {exercise.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlateCalc(true)}
            className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
            aria-label="Calculate Plates"
          >
            <Calculator className="w-5 h-5" />
          </button>
          <button
            onClick={() => removeExercise(exercise.id)}
            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
            aria-label="Remove exercise"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_3rem_2.5rem] gap-2 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">
          <div>Set</div>
          <div>Weight</div>
          <div>Reps</div>
          <div>
            <Check className="w-4 h-4 mx-auto" />
          </div>
          <div></div>
        </div>

        {exercise.sets.map((set, index) => (
          <div
            key={set.id}
            className={`grid grid-cols-[2.5rem_1fr_1fr_3rem_2.5rem] gap-1.5 items-center mb-2 p-1 rounded-lg transition-colors ${set.completed ? "bg-green-900/20" : ""}`}
          >
            <div className="text-center relative">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${set.completed ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}
              >
                {index + 1}
              </span>
            </div>

            <input
              type="text"
              inputMode="decimal"
              value={set.weight || ""}
              onChange={(e) =>
                updateSet(exercise.id, set.id, {
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              className="bg-gray-700/50 rounded-lg p-2 text-center text-white font-mono placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-gray-600 focus:border-transparent"
              placeholder="0"
              disabled={set.completed}
              aria-label="Weight"
            />

            <input
              type="text"
              inputMode="numeric"
              value={set.reps || ""}
              onChange={(e) =>
                updateSet(exercise.id, set.id, {
                  reps: parseInt(e.target.value) || 0,
                })
              }
              className="bg-gray-700/50 rounded-lg p-2 text-center text-white font-mono placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-gray-600 focus:border-transparent"
              placeholder="0"
              disabled={set.completed}
              aria-label="Reps"
            />

            <button
              onClick={() => completeSet(exercise.id, set.id)}
              className={`flex items-center justify-center w-full h-full rounded-lg transition-colors ${set.completed ? "bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
              aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
            >
              <Check className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => removeSet(exercise.id, set.id)}
              className="flex items-center justify-center w-full h-full rounded-lg transition-colors text-gray-500 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30"
              aria-label="Delete set"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={() => addSet(exercise.id)}
          className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-gray-600 text-gray-400 font-medium hover:bg-gray-700/50 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Set
        </button>
      </div>

      {showPlateCalc && createPortal(<PlateCalculator initialWeight={maxWeight} onClose={() => setShowPlateCalc(false)} />, document.body)}
      {showDetails && createPortal(<ExerciseDetailsModal exercise={baseExercise} onClose={() => setShowDetails(false)} />, document.body)}
    </div>
  );
};

export const ExerciseSearchModal = ({
  onClose,
  onSelectExercise,
  exercises,
  onCreateCustomExercise,
}: {
  onClose: () => void;
  onSelectExercise: (ex: Exercise) => void;
  exercises: Exercise[];
  onCreateCustomExercise: (name: string, bodyPart: string, category: Exercise["category"]) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Popular": true,
    "Chest": false,
    "Back": false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return exercises.filter((e) => {
      const matchName = e.name.toLowerCase().includes(q);
      const matchAlias = e.aliases?.some(a => a.toLowerCase().includes(q));
      const matchPart = e.primaryMuscle?.toLowerCase().includes(q) || e.bodyPart?.toLowerCase().includes(q);
      const matchCategory = e.category.toLowerCase().includes(q);
      const matchSecondary = e.secondaryMuscles?.some(m => m.toLowerCase().includes(q));
      return matchName || matchAlias || matchPart || matchCategory || matchSecondary;
    });
  }, [searchQuery, exercises]);

  const groupedExercises = useMemo<Record<string, Exercise[]>>(() => {
    if (searchQuery.trim()) return {}; // Not used when searching
    
    const groups: Record<string, Exercise[]> = {
      "Popular": exercises.filter(e => e.popular),
    };
    
    // Standard ordered muscle groups
    const muscleGroups = [
      "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", 
      "Quads", "Hamstrings", "Glutes", "Calves", "Abs", "Obliques", 
      "Cardio", "Full Body", "Other"
    ];

    muscleGroups.forEach(m => {
      groups[m] = exercises.filter(e => {
        const pm = (e.primaryMuscle || e.bodyPart).toLowerCase();
        if (m === "Other") return !muscleGroups.slice(0, -1).some(mg => pm === mg.toLowerCase());
        return pm === m.toLowerCase();
      });
    });

    return groups;
  }, [searchQuery, exercises]);

  const renderExerciseListing = (ex: Exercise) => (
    <button
      key={ex.id}
      onClick={() => {
        onSelectExercise(ex);
        onClose();
      }}
      className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 border-b border-gray-800/50 transition-colors text-left"
    >
      <div>
        <h4 className="text-white font-medium">{ex.name}</h4>
        <p className="text-sm text-gray-500 capitalize">
          {ex.primaryMuscle || ex.bodyPart} • {ex.category}
        </p>
      </div>
      <Plus className="w-5 h-5 text-gray-500" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 rounded-t-3xl border-t border-gray-800 h-[85vh] flex flex-col animate-in slide-in-from-bottom">
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add Exercise</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 rounded-full bg-gray-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {searchQuery.trim() ? (
            <div className="p-2 space-y-1">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No exercises found for "{searchQuery}".</p>
                  <button 
                    onClick={() => setShowCreateExercise(true)}
                    className="text-blue-400 mt-2 font-medium"
                  >
                    Create custom exercise
                  </button>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-gray-800">
                  {filteredExercises.map(renderExerciseListing)}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3 pb-8">
              {(Object.entries(groupedExercises) as [string, Exercise[]][]).map(([section, items]) => {
                if (items.length === 0) return null;
                const isOpen = openSections[section];
                return (
                  <div key={section} className="bg-gray-800/30 rounded-2xl border border-gray-800/80 overflow-hidden">
                    <button
                      onClick={() => toggleSection(section)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition bg-gray-800/80 font-semibold text-gray-300"
                    >
                      {section} <span className="p-1 rounded bg-gray-900 border border-gray-700 text-xs text-gray-400 ml-auto mr-3">{items.length}</span>
                      <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-800 bg-gray-900/50">
                        {items.map(renderExerciseListing)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <button 
            onClick={() => setShowCreateExercise(true)}
            className="w-full py-3 bg-gray-800 text-blue-400 font-medium rounded-xl hover:bg-gray-700 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Custom Exercise
          </button>
        </div>
      </div>
      
      {showCreateExercise && (
        <CreateCustomExerciseModal
          onClose={() => setShowCreateExercise(false)}
          onCreate={(name, bodyPart, category) => {
            onCreateCustomExercise(name, bodyPart, category);
            setShowCreateExercise(false);
          }}
        />
      )}
    </div>
  );
};

export const CreateCustomExerciseModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, bodyPart: string, category: Exercise["category"]) => void;
}) => {
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("full body");
  const [category, setCategory] = useState<Exercise["category"]>("barbell");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), bodyPart, category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-3xl border-t border-gray-800 p-6 flex flex-col animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <h2 className="text-xl font-bold text-white">Create Custom Exercise</h2>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-full bg-gray-800 hover:text-white">
             <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Exercise Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="e.g. My Custom Lift"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Body Part</label>
            <select
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="forearms">Forearms</option>
              <option value="abs">Abs</option>
              <option value="obliques">Obliques</option>
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="calves">Calves</option>
              <option value="full body">Full Body</option>
              <option value="cardio">Cardio</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Exercise["category"])}
              className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="machine">Machine</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="weighted bodyweight">Weighted Bodyweight</option>
              <option value="time">Time</option>
              <option value="distance">Distance</option>
              <option value="rep only">Reps Only</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition mt-4"
          >
            Create Exercise
          </button>
        </form>
      </div>
    </div>
  );
};
