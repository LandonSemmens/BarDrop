import React, { useState, useEffect } from "react";
import { WorkoutProvider, useWorkout } from "./context/WorkoutContext";
import Workout from "./pages/Workout";
import Routines from "./pages/Routines";
import Stats from "./pages/Stats";
import Social from "./pages/Social";
import Settings from "./pages/Settings";
import {
  Activity,
  Settings as SettingsIcon,
  BarChart2,
  Globe,
  ClipboardList,
} from "lucide-react";

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useWorkout();

  useEffect(() => {
    const root = document.documentElement;
    let effectiveTheme = settings.theme;

    if (effectiveTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      effectiveTheme = isDark ? "dark" : "light";
    }

    if (effectiveTheme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [settings.theme]);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.removeAttribute("data-theme");
      } else {
        root.setAttribute("data-theme", "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme]);

  return <>{children}</>;
}

function Navigation({
  currentTab,
  setTab,
}: {
  currentTab: string;
  setTab: (t: string) => void;
}) {
  const { user } = useWorkout();
  const tabs = [
    { id: "workout", label: "Workout", icon: Activity },
    { id: "routines", label: "Routines", icon: ClipboardList },
    { id: "stats", label: "Stats", icon: BarChart2 },
    { id: "social", label: "Social", icon: Globe },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-around pb-safe px-4 z-40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={(e) => {
                if (!user && tab.id !== "settings") {
                  e.preventDefault();
                  alert("Please sign in to access this feature");
                  setTab("settings");
                  return;
                }
                setTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center w-16 h-14 ${isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-400"}`}
            >
              <Icon
                className={`w-6 h-6 mb-1 ${isActive ? "fill-blue-500/20" : ""}`}
              />
              <span className="text-[10px] font-medium tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 z-40 p-4 shadow-xl">
        <div className="mb-10 mt-2 flex items-center gap-2 px-4 pt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M6 12h12" />
            <path d="M6 8v8" />
            <path d="M18 8v8" />
            <path d="M3 9v6" />
            <path d="M21 9v6" />
          </svg>
          <span className="text-xl font-bold text-black dark:text-white">
            BarDrop
          </span>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  if (!user && tab.id !== "settings") {
                    e.preventDefault();
                    alert("Please sign in to access this feature");
                    setTab("settings");
                    return;
                  }
                  setTab(tab.id);
                }}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-medium border border-transparent ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/60"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "fill-blue-500/20" : ""
                  }`}
                />
                <span className="font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function MainLayout() {
  const [tab, setTab] = useState("workout");
  const { user } = useWorkout();

  const handleIntercept = (e: React.MouseEvent) => {
    if (!user && tab !== "settings") {
      e.stopPropagation();
      e.preventDefault();
      alert("Please sign in to access this feature");
      setTab("settings");
    }
  };

  return (
    <ThemeWrapper>
      <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-blue-500/30 flex">
        <Navigation currentTab={tab} setTab={setTab} />
        
        {/* Main Content Viewport */}
        <main className="flex-1 min-h-screen relative pb-20 md:pb-0 md:pl-64 flex justify-center bg-gray-950">
          <div 
            onClickCapture={handleIntercept}
            className="w-full max-w-lg md:max-w-none md:flex-1 relative md:border-x md:border-gray-900 md:bg-transparent shadow-2xl shadow-blue-900/5 bg-gray-950"
          >
            {tab === "workout" && <Workout setTab={setTab} />}
            {tab === "routines" && <Routines setTab={setTab} />}
            {tab === "stats" && <Stats />}
            {tab === "social" && <Social />}
            {tab === "settings" && <Settings />}
          </div>
        </main>
      </div>
    </ThemeWrapper>
  );
}

export default function App() {
  return (
    <WorkoutProvider>
      <MainLayout />
    </WorkoutProvider>
  );
}
