import React, { useRef, useState } from "react";
import { useWorkout } from "../context/WorkoutContext";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { Settings as SettingsType } from "../types";
import {
  Moon,
  Volume2,
  Vibrate,
  Clock,
  Download,
  Upload,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react";
import { idb, initDB } from "../idb";

import PageHeader from "../components/PageHeader";

export default function Settings() {
  const { user, setUser, settings, updateSettings } = useWorkout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetKeyword, setResetKeyword] = useState("");

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      alert("Login failed. See console.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      setUser(null);
      await signOut(auth);
      console.log("Session successfully flushed.");
    } catch (e) {
      console.error("Sign out execution block exception:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const workouts = await idb.getWorkouts();
      const exercises = await idb.getExercises();
      const routines = await idb.getRoutines();
      const s = await idb.getSettings();

      const payload = {
        version: 1,
        workouts,
        exercises,
        routines,
        settings: s,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bardrop-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.version && json.workouts && json.exercises) {
          if (
            confirm(
              `Import data? Existing conflicting data will be overwritten.`,
            )
          ) {
            for (const w of json.workouts) await idb.saveWorkout(w);
            for (const ex of json.exercises) await idb.saveExercise(ex);
            if (json.routines) {
              for (const r of json.routines) await idb.saveRoutine(r);
            }
            if (json.settings) updateSettings(json.settings);
            alert("Import successful! Refresh to see changes.");
            window.location.reload();
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Could not parse file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pb-32 px-4 animate-in fade-in text-white">
      <PageHeader title="Settings" />

      <div className="mt-6 space-y-8">
        {/* Account Section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Account
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden glass divide-y divide-gray-800">
            {user ? (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      user.photoURL ||
                      `https://ui-avatars.com/api/?name=${user.email}`
                    }
                    alt="Avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-white">
                      {user.displayName || "Lifter"}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}{" "}
                  Logout
                </button>
              </div>
            ) : (
              <div className="p-4 flex flex-col items-stretch gap-4">
                <div className="flex flex-col items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="font-medium text-white">Sign In to BarDrop</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sync workouts across devices and engage socially.
                    </p>
                  </div>
                  <button
                    onClick={handleLogin}
                    disabled={authLoading}
                    className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <LogIn className="w-5 h-5" />
                    )}{" "}
                    Google Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {user && (
          <>
            {/* Preferences */}
            <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Preferences
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden glass divide-y divide-gray-800">
            {/* Theme */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Theme</span>
              </div>
              <div className="bg-gray-800 p-1 rounded-lg flex text-sm">
                <button
                  onClick={() => updateSettings({ theme: "light" })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${settings.theme === "light" ? "bg-gray-700 text-white shadow" : "text-gray-400"}`}
                >
                  Light
                </button>
                <button
                  onClick={() => updateSettings({ theme: "dark" })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${settings.theme === "dark" ? "bg-gray-700 text-white shadow" : "text-gray-400"}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => updateSettings({ theme: "system" })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${settings.theme === "system" ? "bg-gray-700 text-white shadow" : "text-gray-400"}`}
                >
                  System
                </button>
              </div>
            </div>

            {/* Units */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">Weight Unit</span>
              </div>
              <div className="bg-gray-800 p-1 rounded-lg flex text-sm">
                <button
                  onClick={() => updateSettings({ weightUnit: "kg" })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${settings.weightUnit === "kg" ? "bg-gray-700 text-white shadow" : "text-gray-400"}`}
                >
                  KG
                </button>
                <button
                  onClick={() => updateSettings({ weightUnit: "lbs" })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${settings.weightUnit === "lbs" ? "bg-gray-700 text-white shadow" : "text-gray-400"}`}
                >
                  LBS
                </button>
              </div>
            </div>

            {/* Audio */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Sound Effects</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.sound}
                  onChange={(e) => updateSettings({ sound: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Haptics */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Haptic Feedback</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.vibration}
                  onChange={(e) =>
                    updateSettings({ vibration: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Auto Rest Timer</span>
                </div>
                <p className="text-xs text-gray-500 pl-8">
                  Starts automatically when a set is completed.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="bg-gray-800 text-white border border-gray-700 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none"
                  value={settings.defaultRestTime}
                  onChange={(e) =>
                    updateSettings({
                      defaultRestTime: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={30}>30s</option>
                  <option value={60}>1m 00s</option>
                  <option value={90}>1m 30s</option>
                  <option value={120}>2m 00s</option>
                  <option value={180}>3m 00s</option>
                  <option value={300}>5m 00s</option>
                </select>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.restTimerEnabled}
                    onChange={(e) =>
                      updateSettings({ restTimerEnabled: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Plate Calculator & Inventory */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Plate Calculator & Gym Equipment
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden glass divide-y divide-gray-800">
            {/* Visual Breakdown */}
            <div className="flex items-center justify-between p-4">
              <span className="font-medium">Show Visual Breakdown</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.showVisualPlateBreakdown}
                  onChange={(e) =>
                    updateSettings({
                      showVisualPlateBreakdown: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4">
              <span className="font-medium">Active Barbell</span>
              <select
                value={settings.barbellType || "select"}
                onChange={(e) => {
                  const val = e.target.value;
                  let weight = settings.barWeight;
                  if (val === "standard")
                    weight = settings.weightUnit === "kg" ? 20 : 45;
                  else if (val === "womens")
                    weight = settings.weightUnit === "kg" ? 15 : 35;
                  else if (val === "technique")
                    weight = settings.weightUnit === "kg" ? 10 : 15;

                  updateSettings({ barbellType: val, barWeight: weight });
                }}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="select" disabled>
                  Select Preset...
                </option>
                <option value="standard">
                  Standard Olympic (
                  {settings.weightUnit === "kg" ? "20kg" : "45lb"})
                </option>
                <option value="womens">
                  Women's Bar ({settings.weightUnit === "kg" ? "15kg" : "35lb"})
                </option>
                <option value="technique">
                  Technique Bar (
                  {settings.weightUnit === "kg" ? "10kg" : "15lb"})
                </option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {settings.barbellType === "custom" && (
              <div className="flex items-center justify-between p-4 bg-gray-900/50">
                <span className="font-medium text-sm text-gray-400 pl-4">
                  Custom Bar Weight
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.barWeight}
                    onChange={(e) =>
                      updateSettings({
                        barWeight: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-20 bg-gray-800 text-white border border-gray-700 rounded-lg p-2 text-sm focus:ring-blue-500 outline-none text-right font-mono"
                  />
                  <span className="text-sm text-gray-500">
                    {settings.weightUnit}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 flex flex-col gap-4">
              <span className="font-medium">Available Plate Pairs</span>
              <div className="flex flex-wrap gap-2">
                {settings.weightUnit === "lbs"
                  ? [45, 35, 25, 10, 5, 2.5].map((plate) => {
                      const isEnabled = !(
                        settings.availablePlatesLbs &&
                        !settings.availablePlatesLbs.includes(plate)
                      );
                      return (
                        <button
                          key={plate}
                          onClick={() => {
                            const current = settings.availablePlatesLbs ?? [
                              45, 35, 25, 10, 5, 2.5,
                            ];
                            const next = isEnabled
                              ? current.filter((p) => p !== plate)
                              : [...current, plate];
                            updateSettings({ availablePlatesLbs: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${isEnabled ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-500"}`}
                        >
                          {plate}
                        </button>
                      );
                    })
                  : [25, 20, 15, 10, 5, 2.5, 1.25].map((plate) => {
                      const isEnabled = !(
                        settings.availablePlatesKg &&
                        !settings.availablePlatesKg.includes(plate)
                      );
                      return (
                        <button
                          key={plate}
                          onClick={() => {
                            const current = settings.availablePlatesKg ?? [
                              25, 20, 15, 10, 5, 2.5, 1.25,
                            ];
                            const next = isEnabled
                              ? current.filter((p) => p !== plate)
                              : [...current, plate];
                            updateSettings({ availablePlatesKg: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${isEnabled ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-500"}`}
                        >
                          {plate}
                        </button>
                      );
                    })}
              </div>
              <p className="text-xs text-gray-500">
                Tap to disable plates you don't have access to.
              </p>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Data & Backup
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden glass divide-y divide-gray-800">
            <div className="grid grid-cols-2">
              <button
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 hover:bg-gray-800 transition-colors gap-2 border-r border-gray-800"
              >
                <Download className="w-6 h-6 text-green-400" />
                <span className="text-sm font-medium">Export JSON</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 hover:bg-gray-800 transition-colors gap-2"
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-sm font-medium">Import JSON</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleImport}
                />
              </button>
            </div>
            <button
              onClick={() => setShowResetDialog(true)}
              className="w-full text-center p-4 text-red-500 hover:bg-red-500/10 transition-colors font-medium text-sm"
            >
              Reset App Data
            </button>
          </div>
        </section>
          </>
        )}
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-center text-white mb-2">
                Destructive Action
              </h2>
              <p className="text-sm text-gray-400 text-center mb-6">
                This action will permanently delete all Workouts, Routines,
                Custom Exercises, and Settings. This cannot be undone.
              </p>

              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  value={resetKeyword}
                  onChange={(e) => setResetKeyword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono uppercase focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="DELETE"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetDialog(false);
                    setResetKeyword("");
                  }}
                  className="flex-1 py-3 text-sm font-bold text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (resetKeyword.trim().toUpperCase() === "DELETE") {
                      await initDB().then(async (db) => {
                        const tx = db.transaction(
                          ["workouts", "exercises", "routines", "settings"],
                          "readwrite",
                        );
                        await Promise.all([
                          tx.objectStore("workouts").clear(),
                          tx.objectStore("exercises").clear(),
                          tx.objectStore("routines").clear(),
                          tx.objectStore("settings").clear(),
                        ]);
                        await tx.done;
                      });
                      window.location.reload();
                    }
                  }}
                  disabled={resetKeyword.trim().toUpperCase() !== "DELETE"}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Wipe Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
