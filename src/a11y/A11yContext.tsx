import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { HighContrastMode, FontScale } from './preferences';
import { loadA11yPreferences, saveA11yPreferences, type A11yPreferences } from './preferences';

interface A11yContextValue {
  highContrast: HighContrastMode;
  setHighContrast: (mode: HighContrastMode) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  /** Computed CSS --font-scale multiplier for the root. */
  fontScaleMultiplier: number;
}

const A11yContext = createContext<A11yContextValue | null>(null);

const FONT_SCALE_MULTIPLIERS: Record<FontScale, number> = {
  small: 0.875,
  medium: 1,
  large: 1.25,
};

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPreferences>(loadA11yPreferences);

  useEffect(() => {
    saveA11yPreferences(prefs);
  }, [prefs]);

  const fontScaleMultiplier = FONT_SCALE_MULTIPLIERS[prefs.fontScale];

  const value = useMemo<A11yContextValue>(
    () => ({
      highContrast: prefs.highContrast,
      setHighContrast: (mode) => setPrefs((prev) => ({ ...prev, highContrast: mode })),
      fontScale: prefs.fontScale,
      setFontScale: (scale) => setPrefs((prev) => ({ ...prev, fontScale: scale })),
      fontScaleMultiplier,
    }),
    [prefs.highContrast, prefs.fontScale],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', prefs.highContrast === 'high');
    root.style.setProperty('--font-scale', String(fontScaleMultiplier));
  }, [prefs.highContrast, fontScaleMultiplier]);

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used within A11yProvider');
  return ctx;
}
