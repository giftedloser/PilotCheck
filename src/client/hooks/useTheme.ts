import { useCallback, useEffect } from "react";

import { usePreference } from "./usePreference.js";

export type Theme = "dark" | "light" | "system";

const THEMES: Theme[] = ["dark", "light", "system"];

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "dark" | "light") {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function useTheme(): [Theme, () => void, "dark" | "light"] {
  const [theme, setTheme] = usePreference<Theme>("theme", "dark");

  const resolved = resolveTheme(theme);

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolveTheme("system"));
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const cycle = useCallback(() => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  }, [theme, setTheme]);

  return [theme, cycle, resolved];
}
