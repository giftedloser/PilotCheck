import { useCallback, useEffect, useState } from "react";

const PREFERENCE_CHANGE_EVENT = "pilotcheck:preference-change";

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
    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === storageKey) setValue(read());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PREFERENCE_CHANGE_EVENT, onPreferenceChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, onPreferenceChange);
    };
  }, [storageKey, read]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(PREFERENCE_CHANGE_EVENT, { detail: { key: storageKey } }));
      } catch {
        // storage quota or disabled — ignore
      }
    },
    [storageKey]
  );

  return [value, update];
}
