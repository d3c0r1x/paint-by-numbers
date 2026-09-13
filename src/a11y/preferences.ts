/**
 * High contrast mode and font scaling per an accessibility phase-3 improvement.
 *
 * Значения:
 * - highContrast: 'default' | 'high'
 * - fontScale: 'small' | 'medium' | 'large'
 *
 * Хранятся отдельно от darkMode, но в том же localStorage-слое, чтобы не
 * смешивать тему с настройками доступности.
 */
export type HighContrastMode = 'default' | 'high';
export type FontScale = 'small' | 'medium' | 'large';

export interface A11yPreferences {
  highContrast: HighContrastMode;
  fontScale: FontScale;
}

const DEFAULT_A11Y: A11yPreferences = {
  highContrast: 'default',
  fontScale: 'medium',
};

export function loadA11yPreferences(): A11yPreferences {
  try {
    const raw = localStorage.getItem('pbn.a11y');
    if (!raw) return DEFAULT_A11Y;
    const parsed = JSON.parse(raw) as Partial<A11yPreferences>;
    return {
      highContrast: parsed.highContrast ?? DEFAULT_A11Y.highContrast,
      fontScale: parsed.fontScale ?? DEFAULT_A11Y.fontScale,
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

export function saveA11yPreferences(prefs: A11yPreferences): void {
  try {
    localStorage.setItem('pbn.a11y', JSON.stringify(prefs));
  } catch {
    // ignore private mode / restricted storage
  }
}
