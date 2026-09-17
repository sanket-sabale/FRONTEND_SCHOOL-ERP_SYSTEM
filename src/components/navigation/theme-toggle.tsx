"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { appStorage } from "@/lib/storage";
import type { ThemeMode } from "@/stores/ui-store";

const storageKey = "school-erp-theme";
const themeChangeEvent = "school-erp-theme-change";

function applyTheme(theme: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (theme === "system") applyTheme("system");
    };

    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [theme]);

  function handleThemeChange(nextTheme: ThemeMode) {
    appStorage.set(storageKey, nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
    applyTheme(nextTheme);
  }

  const options: Array<{
    label: string;
    mode: ThemeMode;
    icon: React.ReactNode;
  }> = [
    { label: "Use light theme", mode: "light", icon: <SunIcon /> },
    { label: "Use dark theme", mode: "dark", icon: <MoonIcon /> },
    { label: "Use system theme", mode: "system", icon: <SystemIcon /> },
  ];

  return (
    <div
      aria-label="Theme mode"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950"
      role="group"
    >
      {options.map((option) => (
        <Button
          aria-label={option.label}
          key={option.mode}
          onClick={() => handleThemeChange(option.mode)}
          selected={theme === option.mode}
          size="icon"
          title={option.label}
          variant={theme === option.mode ? "secondary" : "ghost"}
        >
          {option.icon}
        </Button>
      ))}
    </div>
  );
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

function getThemeSnapshot(): ThemeMode {
  const storedTheme = appStorage.get(storageKey);

  return isThemeMode(storedTheme) ? storedTheme : "light";
}

function getServerThemeSnapshot(): ThemeMode {
  return "light";
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4V2m0 20v-2m5.66-13.66 1.41-1.41M4.93 19.07l1.41-1.41M20 12h2M2 12h2m15.07 7.07-1.41-1.41M4.93 4.93l1.41 1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M21 14.2A7.5 7.5 0 0 1 9.8 3 8.5 8.5 0 1 0 21 14.2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 5h16v11H4V5Zm6 15h4m-6 0h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
