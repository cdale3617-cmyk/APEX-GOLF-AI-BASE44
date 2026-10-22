import { useCallback, useEffect, useState } from 'react';

const KEY = 'apex_golf_drills_v1';
const EMPTY = { attempts: 0, made: 0, best: 0 };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Per-drill rep tallies and best completion rate, kept on this device. */
export function useDrillProgress() {
  const [progress, setProgress] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* storage blocked — the session still works in memory */
    }
  }, [progress]);

  const record = useCallback((drillId, made) => {
    setProgress((prev) => {
      const entry = { ...EMPTY, ...(prev[drillId] ?? {}) };
      const attempts = entry.attempts + 1;
      const hits = entry.made + (made ? 1 : 0);
      return {
        ...prev,
        [drillId]: {
          attempts,
          made: hits,
          best: Math.max(entry.best, Math.round((hits / attempts) * 100)),
        },
      };
    });
  }, []);

  const reset = useCallback((drillId) => {
    setProgress((prev) => ({ ...prev, [drillId]: { ...EMPTY, best: prev[drillId]?.best ?? 0 } }));
  }, []);

  const resetAll = useCallback(() => {
    setProgress((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, entry]) => [id, { ...EMPTY, best: entry.best ?? 0 }])),
    );
  }, []);

  return { progress, record, reset, resetAll };
}