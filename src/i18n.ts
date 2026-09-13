import ru from './locales/ru.json';
import en from './locales/en.json';

export type Lang = 'ru' | 'en';

const DICTS: Record<Lang, Record<string, string>> = {
  ru: ru as Record<string, string>,
  en: en as Record<string, string>,
};

const STORAGE_KEY = 'pbn.lang';

/** Saved preference wins; otherwise navigator.language with 'ru' prefix → russian. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    // localStorage can throw in private mode; fall through to detection
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav && nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore persistence failures
  }
}

/** Translate a key; {n} and similar placeholders are replaced from args. */
export function translate(lang: Lang, key: string, args?: Record<string, string | number>): string {
  const dict = DICTS[lang];
  let text = dict[key] ?? DICTS.en[key] ?? key;
  if (args) {
    for (const [name, value] of Object.entries(args)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
