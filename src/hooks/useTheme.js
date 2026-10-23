import { useCallback, useEffect, useState } from 'react';

const KEY = 'apex_golf_theme';
const PALETTE_KEY = 'apex_golf_palette';
const PALETTE_EVENT = 'apex-golf-palette-change';
export const PALETTES = [
  { id: 'vibrant', label: 'Apex Vibrant' },
  { id: 'emerald', label: 'Emerald / Gold' },
  { id: 'blue', label: 'Blue / Gold' },
  { id: 'copper', label: 'Copper / Black' },
  { id: 'ice', label: 'Ice / Teal' },
];

const validPalette = (value) => PALETTES.some((p) => p.id === value) ? value : 'vibrant';
function readStorage(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function applyTheme(theme, palette) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.dataset.apexPalette = palette;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#FAFCFF' : '#09111F');
}

/** Daylight contrast independent from one of the original four style choices. */
export function useTheme() {
  const [theme, setTheme] = useState(() => readStorage(KEY, 'dark') === 'light' ? 'light' : 'dark');
  const [palette, setPaletteState] = useState(() => validPalette(readStorage(PALETTE_KEY, 'vibrant')));

  useEffect(() => {
    const sync = (event) => setPaletteState(validPalette(event.detail));
    window.addEventListener(PALETTE_EVENT, sync);
    return () => window.removeEventListener(PALETTE_EVENT, sync);
  }, []);

  useEffect(() => {
    applyTheme(theme, palette);
    try {
      localStorage.setItem(KEY, theme);
      localStorage.setItem(PALETTE_KEY, palette);
    } catch { /* colors work for this session */ }
  }, [theme, palette]);

  const toggle = useCallback(() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')), []);
  const setPalette = useCallback((next) => {
    const choice = validPalette(next);
    setPaletteState(choice);
    window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: choice }));
  }, []);

  return { theme, toggle, palette, setPalette };
}
