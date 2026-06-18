import React, { useRef, useEffect, useState, useMemo } from "react";
import { useWorkout } from "../context/WorkoutContext";
import {
  Activity,
  Dumbbell,
  Calendar as CalIcon,
  Calculator,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  GripVertical,
  Flame,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Workout, Exercise } from "../types";
import PlateCalculator from "../components/PlateCalculator";
import MuscleRecoveryMap from "../components/MuscleRecoveryMap";

import PageHeader from "../components/PageHeader";

function ProgressionChart({
  workouts,
  settings,
}: {
  workouts: Workout[];
  settings: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showData, setShowData] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
    date: string;
  } | null>(null);
  const [activeMetric, setActiveMetric] = useState<
    "volume" | "duration" | "reps"
  >("volume");

  const sortedWorkouts = useMemo(() => {
    return [...workouts]
      .filter((w) => w.status === "completed")
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-10);
  }, [workouts]);

  const chartData = useMemo(() => {
    return sortedWorkouts.map((w) => {
      let val = 0;
      if (activeMetric === "volume") {
        val = w.exercises.reduce((acc, ex) => {
          return (
            acc +
            ex.sets.reduce(
              (sAcc, s) =>
                sAcc +
                (s.completed && s.weight && s.reps ? s.weight * s.reps : 0),
              0,
            )
          );
        }, 0);
      } else if (activeMetric === "duration") {
        val = w.endTime ? Math.round((w.endTime - w.startTime) / 60000) : 0;
      } else if (activeMetric === "reps") {
        val = w.exercises.reduce((acc, ex) => {
          return (
            acc +
            ex.sets.reduce(
              (sAcc, s) => sAcc + (s.completed && s.reps ? s.reps : 0),
              0,
            )
          );
        }, 0);
      }

      return {
        date: new Date(w.endTime || w.startTime).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        value: val,
        id: w.id,
      };
    });
  }, [sortedWorkouts, activeMetric]);

  const metricLabel =
    activeMetric === "volume"
      ? settings.weightUnit
      : activeMetric === "duration"
        ? "min"
        : "reps";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (chartData.length < 2) {
      return;
    }

    const padding = 20;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxV = Math.max(...chartData.map((d) => d.value), 1);

    // Line
    ctx.beginPath();
    chartData.forEach((d, idx) => {
      const x = padding + (idx / (chartData.length - 1)) * chartW;
      const y = height - padding - (d.value / maxV) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    // Gradient fill
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
    grad.addColorStop(0, "rgba(59, 130, 246, 0.4)");
    grad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Points
    chartData.forEach((d, idx) => {
      const x = padding + (idx / (chartData.length - 1)) * chartW;
      const y = height - padding - (d.value / maxV) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // We will save these coords for tooltip hitting
      (d as any)._x = x;
      (d as any)._y = y;
    });
  }, [chartData]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (chartData.length < 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let hit = null;
    for (const d of chartData) {
      if ((d as any)._x !== undefined && (d as any)._y !== undefined) {
        const dx = (d as any)._x - x;
        const dy = (d as any)._y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          // 15px radius for easy tap
          hit = d;
          break;
        }
      }
    }

    if (hit && (hit as any)._x !== undefined && (hit as any)._y !== undefined) {
      // Convert canvas coords back to CSS coords for tooltip positioning
      const cssX = (hit as any)._x / scaleX;
      const cssY = (hit as any)._y / scaleY;
      setTooltip({
        x: cssX,
        y: cssY,
        text: `${hit.value.toLocaleString()} ${metricLabel}`,
        date: hit.date,
      });

      // Hide tooltip after config
      setTimeout(() => setTooltip(null), 3000);
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl glass flex flex-col overflow-hidden relative">
      <div className="flex gap-2 p-4 pb-0 overflow-x-auto no-scrollbar">
        {(["volume", "duration", "reps"] as const).map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize whitespace-nowrap transition-colors ${activeMetric === metric ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
          >
            {metric}
          </button>
        ))}
      </div>
      <div className="relative w-full aspect-[2/1] lg:aspect-[16/9] lg:max-w-3xl lg:mx-auto max-h-64 lg:max-h-80 p-4 pb-2">
        {chartData.length < 2 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-base font-medium tracking-normal text-gray-400 normal-case select-none">
              Needs more workouts
            </p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={340}
              height={160}
              className="w-full h-full object-contain cursor-pointer touch-none"
              onPointerDown={handlePointerDown}
            />
            {tooltip && (
              <div
                className="absolute bg-gray-800 text-white border border-gray-700 shadow-xl rounded-lg px-3 py-2 text-xs font-mono z-10 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 flex flex-col items-center gap-1 animate-in fade-in"
                style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
              >
                <span className="font-bold text-gray-400 font-sans">
                  {tooltip.date}
                </span>
                <span className="text-blue-400">{tooltip.text}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => setShowData(!showData)}
          className="text-xs text-blue-400 font-medium hover:bg-gray-800 w-full py-2 rounded-lg transition-colors border border-transparent hover:border-gray-700"
        >
          {showData ? "Hide Data" : "View Session Data"}
        </button>

        {showData && (
          <div className="mt-2 space-y-1 animate-in slide-in-from-top-2">
            {chartData.map((d, i) => (
              <div
                key={d.id || i}
                className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg text-sm border border-gray-800/80 hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-400 font-medium">{d.date}</span>
                <span className="font-mono text-gray-200">
                  {d.value.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500">{metricLabel}</span>
                </span>
              </div>
            ))}
            {chartData.length === 0 && (
              <div className="text-center text-xs text-gray-500 py-4">
                No data available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const getMuscleData = (
  workouts: Workout[],
  allExercises: Exercise[] = [],
) => {
  const muscleGroups = [
    { name: "Chest", val: 0, color: "#ef4444" },
    { name: "Back", val: 0, color: "#f97316" },
    { name: "Shoulders", val: 0, color: "#f59e0b" },
    { name: "Biceps", val: 0, color: "#eab308" },
    { name: "Triceps", val: 0, color: "#84cc16" },
    { name: "Forearms", val: 0, color: "#22c55e" },
    { name: "Quads", val: 0, color: "#10b981" },
    { name: "Hamstrings", val: 0, color: "#14b8a6" },
    { name: "Glutes", val: 0, color: "#06b6d4" },
    { name: "Calves", val: 0, color: "#0ea5e9" },
    { name: "Abs", val: 0, color: "#3b82f6" },
    { name: "Obliques", val: 0, color: "#6366f1" },
    { name: "Cardio", val: 0, color: "#8b5cf6" },
    { name: "Full Body", val: 0, color: "#d946ef" },
    { name: "Other", val: 0, color: "#9ca3af" },
  ];

  workouts.forEach((w) => {
    if (!w.exercises) return;
    w.exercises.forEach((ex) => {
      const setsCount = ex.sets ? ex.sets.filter((s) => s.completed).length : 0;

      const p = ex.name.toLowerCase();

      const exAny = ex as any;
      const baseEx = allExercises.find((e) => e.id === ex.exerciseId);
      const primaryMuscle = exAny.primaryMuscle || baseEx?.primaryMuscle;
      const bodyPart = exAny.bodyPart || baseEx?.bodyPart;

      // Determine muscle group
      let match = "Other";
      if (primaryMuscle) {
        match = primaryMuscle;
      } else if (bodyPart && bodyPart.toLowerCase() !== "other") {
        match = bodyPart;
      } else {
        if (
          p.includes("chest") ||
          p.includes("bench press") ||
          p.includes("fly") ||
          p.includes("push up")
        )
          match = "Chest";
        else if (
          p.includes("back") ||
          p.includes("pull up") ||
          p.includes("row") ||
          p.includes("lat") ||
          (p.includes("deadlift") && !p.includes("romanian"))
        )
          match = "Back";
        else if (
          p.includes("shoulder") ||
          (p.includes("press") && !p.includes("bench") && !p.includes("leg")) ||
          p.includes("raise")
        )
          match = "Shoulders";
        else if (
          p.includes("bicep") ||
          (p.includes("curl") && !p.includes("leg"))
        )
          match = "Biceps";
        else if (
          p.includes("tricep") ||
          p.includes("skull") ||
          p.includes("pushdown") ||
          p.includes("dips")
        )
          match = "Triceps";
        else if (p.includes("forearm") || p.includes("wrist"))
          match = "Forearms";
        else if (
          p.includes("quad") ||
          p.includes("squat") ||
          p.includes("leg press") ||
          p.includes("leg extension")
        )
          match = "Quads";
        else if (
          p.includes("hamstring") ||
          p.includes("leg curl") ||
          p.includes("romanian") ||
          p.includes("stiff leg")
        )
          match = "Hamstrings";
        else if (p.includes("glute") || p.includes("hip thrust"))
          match = "Glutes";
        else if (p.includes("calf") || p.includes("calves")) match = "Calves";
        else if (
          p.includes("abs") ||
          p.includes("crunch") ||
          p.includes("sit up") ||
          p.includes("leg raise") ||
          (p.includes("plank") && !p.includes("side"))
        )
          match = "Abs";
        else if (
          p.includes("oblique") ||
          p.includes("russian") ||
          p.includes("woodchopper") ||
          p.includes("side plank")
        )
          match = "Obliques";
        else if (
          p.includes("cardio") ||
          p.includes("run") ||
          p.includes("bike") ||
          p.includes("treadmill") ||
          p.includes("elliptical") ||
          p.includes("rowing machine") ||
          p.includes("jump rope") ||
          p.includes("stair")
        )
          match = "Cardio";
        else if (
          p.includes("full body") ||
          p.includes("burpee") ||
          p.includes("kettlebell swing")
        )
          match = "Full Body";
      }

      const found = muscleGroups.find(
        (m) => m.name.toLowerCase() === match.toLowerCase(),
      );
      if (found) found.val += setsCount;
      else muscleGroups[14].val += setsCount;
    });
  });

  return muscleGroups.filter((m) => m.val > 0); // Only return groups with data
};

function drawMuscleChart(
  canvas: HTMLCanvasElement,
  muscles: { name: string; val: number; color: string }[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const total = muscles.reduce((acc, m) => acc + m.val, 0) || 1; // avoid /0

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2.2;

  let currentAngle = -0.5 * Math.PI;

  muscles.forEach((m) => {
    const sliceAngle = (m.val / total) * 2 * Math.PI;

    if (m.val > 0) {
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        currentAngle,
        currentAngle + sliceAngle,
      );
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = m.color;
      ctx.fill();
    }

    currentAngle += sliceAngle;
  });

  if (total === 1 && muscles.every((m) => m.val === 0)) {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No Data", centerX, centerY);
  }
}

const ActivityGrid = ({ workouts }: { workouts: Workout[] }) => {
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    count: number;
    volume: number;
  } | null>(null);

  const msPerDay = 86400000;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysData = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(now.getTime() - (29 - i) * msPerDay);
    return {
      date: d,
      count: 0,
      volume: 0,
    };
  });

  workouts.forEach((w) => {
    const wDate = new Date(w.startTime);
    wDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - wDate.getTime()) / msPerDay);
    if (diffDays >= 0 && diffDays < 30) {
      const idx = 29 - diffDays;
      daysData[idx].count++;

      let vol = 0;
      if (w.exercises) {
        w.exercises.forEach((ex) => {
          if (ex.sets) {
            ex.sets.forEach((s) => {
              if (s.completed && s.weight && s.reps) {
                vol += s.weight * s.reps;
              }
            });
          }
        });
      }
      daysData[idx].volume += vol;
    }
  });

  const getMonthLabel = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", day: "numeric" });

  const weeks = [];
  for (let i = 0; i < daysData.length; i += 7) {
    weeks.push(daysData.slice(i, i + 7));
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
        {weeks.map((week, weekIdx) => (
          <React.Fragment key={weekIdx}>
            <div className="text-xs text-gray-500 text-right w-12 shrink-0">
              {getMonthLabel(week[0].date)}
            </div>
            <div className="grid grid-cols-7 gap-1.5 w-full">
              {week.map((day, dayIdx) => {
                let fill = "bg-gray-800";
                if (day.count === 1) fill = "bg-green-800";
                if (day.count === 2) fill = "bg-green-600";
                if (day.count > 2) fill = "bg-green-400";

                let tooltipClasses = "bottom-full mb-2 origin-bottom ";
                if (weekIdx <= 1) {
                  tooltipClasses = "top-full mt-2 origin-top ";
                }

                if (dayIdx >= 5) {
                  tooltipClasses += "right-0";
                } else if (dayIdx <= 1) {
                  tooltipClasses += "left-0";
                } else {
                  tooltipClasses += "left-1/2 -translate-x-1/2";
                }

                return (
                  <div
                    key={dayIdx}
                    className={`${fill} aspect-square rounded-sm cursor-pointer relative group hover:z-50 transition-transform hover:scale-110`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div
                      className={`absolute ${tooltipClasses} hidden group-hover:block z-50 w-max bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs p-2.5 rounded-lg shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-200 dark:border-gray-700 pointer-events-none`}
                    >
                      <p className="font-bold text-gray-900 dark:text-gray-200">
                        {getMonthLabel(day.date)}
                      </p>
                      <p className="mt-1 font-medium">
                        {day.count} workout{day.count !== 1 ? "s" : ""}
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        {day.volume.toLocaleString()} volume
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 p-3 bg-gray-800/80 border border-gray-700 rounded-xl text-sm flex justify-between items-center text-white animate-in slide-in-from-bottom-2">
          <div>
            <span className="font-bold">
              {getMonthLabel(selectedDay.date)}:
            </span>{" "}
            {selectedDay.count} workout{selectedDay.count !== 1 ? "s" : ""}
          </div>
          <div className="text-gray-400 font-mono text-xs">
            {selectedDay.volume.toLocaleString()} lbs vol
          </div>
        </div>
      )}
    </div>
  );
};

export default function Stats() {
  const { workoutHistory, settings, exercises, updateSettings } = useWorkout();

  const muscleCanvasRef = useRef<HTMLCanvasElement>(null);

  const [calcWeight, setCalcWeight] = useState(100);
  const [calcReps, setCalcReps] = useState(5);
  const [showCalculators, setShowCalculators] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [warmupWeight, setWarmupWeight] = useState(135);

  const getAchievableWeight = (target: number) => {
    if (target <= settings.barWeight) return settings.barWeight;
    let remainingPerSide = (target - settings.barWeight) / 2;
    const plates =
      settings.weightUnit === "kg"
        ? (settings.availablePlatesKg ?? [25, 20, 15, 10, 5, 2.5, 1.25])
        : (settings.availablePlatesLbs ?? [45, 35, 25, 10, 5, 2.5]);

    let achievablePerSide = 0;
    const sorted = [...plates].sort((a, b) => b - a);
    for (const plate of sorted) {
      if (remainingPerSide >= plate) {
        const factor = Math.round((remainingPerSide / plate) * 1000) / 1000;
        const count = Math.floor(factor);
        if (count > 0) {
          achievablePerSide += count * plate;
          remainingPerSide -= count * plate;
        }
      }
    }
    return settings.barWeight + achievablePerSide * 2;
  };

  const warmupSets = [
    { percent: 50, reps: 10, weight: getAchievableWeight(warmupWeight * 0.5) },
    { percent: 70, reps: 6, weight: getAchievableWeight(warmupWeight * 0.7) },
    { percent: 80, reps: 3, weight: getAchievableWeight(warmupWeight * 0.8) },
    { percent: 90, reps: 1, weight: getAchievableWeight(warmupWeight * 0.9) },
  ];

  let layoutOrder = settings.statsLayoutOrder || [
    "activity",
    "charts",
    "muscleDistribution",
    "recoveryStatus",
    "calculators",
  ];
  // Migrate existing settings that use the old 'recovery' combined block
  if (layoutOrder.includes("recovery")) {
    layoutOrder = layoutOrder.flatMap((item) =>
      item === "recovery" ? ["muscleDistribution", "recoveryStatus"] : [item],
    );
  }

  const calcOrder = settings.calculatorsLayoutOrder || [
    "1rm",
    "plate",
    "warmup",
  ];

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    if (result.source.droppableId === "stats-layout") {
      const newOrder = Array.from(layoutOrder);
      const [removed] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, removed);
      updateSettings({ statsLayoutOrder: newOrder });
    }
  };

  const moveCalcItem = (index: number, direction: "up" | "down") => {
    const newOrder = Array.from(calcOrder);
    if (direction === "up" && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
    } else if (direction === "down" && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
    }
    updateSettings({ calculatorsLayoutOrder: newOrder });
  };

  const oneRM = Math.round(calcWeight * (36 / (37 - calcReps)));

  const muscles = React.useMemo(
    () => getMuscleData(workoutHistory, exercises),
    [workoutHistory, exercises],
  );
  const totalMuscleSets = React.useMemo(
    () => muscles.reduce((acc, m) => acc + m.val, 0),
    [muscles],
  );

  useEffect(() => {
    if (muscleCanvasRef.current)
      drawMuscleChart(muscleCanvasRef.current, muscles);
  }, [muscles]);

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "activity":
        return (
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CalIcon className="w-4 h-4" /> 30-Day Activity
              </h2>
              <span className="text-xs text-gray-500 font-mono">
                {workoutHistory.length} workouts total
              </span>
            </div>
            <div
              className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 glass relative ${reorderMode ? "pointer-events-none" : ""}`}
            >
              <ActivityGrid workouts={workoutHistory} />
            </div>
          </section>
        );
      case "charts":
        return (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Progression Charts
            </h2>
            <div className={reorderMode ? "pointer-events-none" : ""}>
              <ProgressionChart workouts={workoutHistory} settings={settings} />
            </div>
          </section>
        );
      case "muscleDistribution":
        return (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Muscle Distribution
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 glass flex flex-col items-center">
              <canvas
                ref={muscleCanvasRef}
                width={200}
                height={200}
                className="w-full max-w-[200px] h-auto"
              />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 w-full px-2">
                {muscles.map((m) => {
                  const percentage =
                    totalMuscleSets === 0
                      ? 0
                      : Math.round((m.val / totalMuscleSets) * 100);
                  return (
                    <div
                      key={m.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="text-gray-300 truncate">{m.name}</span>
                      <span className="text-gray-500 font-mono ml-auto">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case "recoveryStatus":
        return (
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recovery Status
              </h2>
            </div>
            <div
              className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 glass overflow-hidden ${reorderMode ? "pointer-events-none" : ""}`}
            >
              <MuscleRecoveryMap />
            </div>
          </section>
        );
      case "calculators":
        return (
          <section>
            <button
              onClick={() => {
                if (!reorderMode) setShowCalculators(!showCalculators);
              }}
              className={`w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-2xl text-left transition-colors ${reorderMode ? "" : "hover:bg-gray-800/80 cursor-pointer"}`}
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Calculators</span>
                  <span className="text-xs text-gray-500">
                    1RM Estimator, Barbell Maths & Warmups
                  </span>
                </div>
              </div>
              {showCalculators ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showCalculators && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                {calcOrder.map((calcId, index) => (
                  <div key={calcId} className="relative z-auto">
                    {reorderMode && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                        <button
                          onClick={() => moveCalcItem(index, "up")}
                          disabled={index === 0}
                          className="bg-gray-800 rounded-lg p-1.5 border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors text-white shadow-lg active:scale-95"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => moveCalcItem(index, "down")}
                          disabled={index === calcOrder.length - 1}
                          className="bg-gray-800 rounded-lg p-1.5 border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors text-white shadow-lg active:scale-95"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <div
                      className={`transition-all duration-200 ${reorderMode ? "opacity-50 pointer-events-none pr-14" : "opacity-100"}`}
                    >
                      {calcId === "1rm" && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 glass">
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" /> 1RM Calculator
                            (Brzycki)
                          </h3>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Weight
                              </label>
                              <input
                                type="number"
                                value={calcWeight}
                                onChange={(e) =>
                                  setCalcWeight(parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-gray-800 text-white rounded-xl py-2 px-3 border border-gray-700 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">
                                Reps
                              </label>
                              <input
                                type="number"
                                value={calcReps}
                                onChange={(e) =>
                                  setCalcReps(parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-gray-800 text-white rounded-xl py-2 px-3 border border-gray-700 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                            <span className="text-gray-400 font-medium">
                              Estimated 1RM
                            </span>
                            <span className="text-2xl font-bold font-mono text-blue-400 drop-shadow-md">
                              {oneRM}{" "}
                              <span className="text-sm text-gray-600">
                                {settings.weightUnit}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                      {calcId === "plate" && (
                        <PlateCalculator initialWeight={oneRM} inline />
                      )}

                      {calcId === "warmup" && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 glass">
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-400" /> Warmup
                            Generator
                          </h3>
                          <div className="mb-4">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Target Working Weight
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={warmupWeight}
                                onChange={(e) =>
                                  setWarmupWeight(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="flex-1 bg-gray-800 text-white rounded-xl py-2 px-3 border border-gray-700 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                              <div className="bg-gray-800 text-gray-400 px-3 py-2 rounded-xl border border-gray-700 flex items-center justify-center font-mono text-sm">
                                {settings.weightUnit}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-[3fr_2fr_3fr] text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-800 px-2">
                              <span>Set</span>
                              <span className="text-center">Reps</span>
                              <span className="text-right">Weight</span>
                            </div>
                            {warmupSets.map((set, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-[3fr_2fr_3fr] items-center bg-gray-800/30 p-2 rounded-lg text-sm"
                              >
                                <span className="text-gray-400 font-medium">
                                  Set {i + 1}{" "}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({set.percent}%)
                                  </span>
                                </span>
                                <span className="text-center font-mono text-gray-300">
                                  {set.reps}
                                </span>
                                <span className="text-right font-mono font-bold text-orange-400">
                                  {set.weight}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-32 px-4 animate-in fade-in text-white md:max-w-6xl md:mx-auto">
      <PageHeader
        title="Your Stats"
        action={
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`p-2 rounded-lg transition-colors ${reorderMode ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        }
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="stats-layout">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="mt-6 min-h-[400px] space-y-6 md:space-y-0 md:columns-2 lg:columns-2 md:gap-6 lg:gap-8"
            >
              {layoutOrder.map((sectionId, index) => {
                return (
                  <Draggable
                    // @ts-expect-error - key is a valid React prop
                    key={sectionId}
                    draggableId={sectionId}
                    index={index}
                    isDragDisabled={!reorderMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`relative flex flex-col break-inside-avoid md:mb-6 lg:mb-8 ${snapshot.isDragging ? "z-50 drop-shadow-2xl opacity-90" : "z-auto"}`}
                      >
                        {reorderMode && (
                          <div
                            {...provided.dragHandleProps}
                            className="absolute -left-2 top-1/2 -translate-y-1/2 p-2.5 z-20 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing bg-gray-900 rounded-xl shadow-lg border border-gray-700 backdrop-blur-md"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>
                        )}
                        <div
                          className={`flex-1 transition-all duration-200 ${reorderMode ? "ml-8 opacity-60 scale-[0.98]" : "ml-0 opacity-100 scale-100"}`}
                        >
                          {renderSection(sectionId)}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
