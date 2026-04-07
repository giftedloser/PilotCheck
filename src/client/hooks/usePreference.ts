import { useCallback, useEffect, useState } from "react";

/**
 * Tiny persisted-preference hook backed by localStorage. Safe against
 * SSR, JSON corruption, and cross-tab changes.
 */
export function usePreference<T>(key: string, initial: T): [T, (value: T) => void] {
  const storageKey = `pilotcheck.pref.${key}`;

  const read = useCallback((): T => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [storageKey, initial]);

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) setValue(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, read]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage quota or disabled — ignore
      }
    },
    [storageKey]
  );

  return [value, update];
}
