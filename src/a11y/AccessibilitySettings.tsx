import { useA11y } from '../a11y/A11yContext';
import type { FontScale } from '../a11y/preferences';
import { IconCheck } from '../ui/icons';

interface Props {
  onClose: () => void;
}

const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 'small', label: 'Маленький' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
];

export function AccessibilitySettings({}: Props) {
  const { highContrast, setHighContrast, fontScale, setFontScale } = useA11y();

  function handleToggle() {
    setHighContrast(highContrast === 'high' ? 'default' : 'high');
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={highContrast === 'high'}
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          highContrast === 'high'
            ? 'bg-ink text-paper'
            : 'border border-paper-deep bg-paper text-ink-soft'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="text-base leading-none" aria-hidden="true">
            ◐
          </span>
          {highContrast === 'high' ? 'Высокий контраст' : 'Высокий контраст'}
        </span>
        <span
          className={`rounded-full border-2 px-1.5 text-[11px] font-bold ${
            highContrast === 'high' ? 'border-paper text-paper' : 'border-ink-faint text-ink-faint'
          }`}
          aria-hidden="true"
        >
          {highContrast === 'high' ? 'Вкл' : 'Выкл'}
        </span>
      </button>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-ink-soft">Размер шрифта</legend>
        <div className="flex gap-2">
          {FONT_SCALE_OPTIONS.map((option) => {
            const selected = fontScale === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFontScale(option.value)}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  selected ? 'bg-ink text-paper' : 'border border-paper-deep bg-paper text-ink-soft'
                }`}
              >
                {option.label}
                <IconCheck
                  size={14}
                  className={`shrink-0 ${selected ? 'block' : 'hidden'}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
