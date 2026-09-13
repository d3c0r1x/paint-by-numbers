import { useEffect, useRef } from 'react';
import type { PaletteEntry } from '../engine/types';
import { symbolFor } from '../engine/symbols';
import { ColorCircle } from './ColorCircle';
import { IconPlus } from './icons';

interface Props {
  palette: PaletteEntry[];
  customColors: string[];
  activeIndex: number | null;
  activeCustom: string | null;
  onSelect: (index: number) => void;
  onSelectCustom: (hex: string) => void;
  onAddCustom: (hex: string) => void;
}

export function PaletteBar({
  palette,
  customColors,
  activeIndex,
  activeCustom,
  onSelect,
  onSelectCustom,
  onAddCustom,
}: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the active circle into view (mouse wheel / touch scroll otherwise).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeIndex, activeCustom]);

  return (
    <div className="pointer-events-auto flex items-center gap-2.5 rounded-[26px] border border-paper-deep bg-paper/95 px-3.5 py-2.5 shadow-[0_4px_20px_rgb(28_25_23/0.15)] backdrop-blur">
      <div className="thin-scroll flex max-w-[68vw] items-center gap-2 overflow-x-auto py-0.5">
        {palette.map((entry) => (
          <div
            key={entry.index}
            ref={activeIndex === entry.index ? activeRef : undefined}
            className="flex shrink-0"
          >
            <ColorCircle
              hex={entry.hex}
              number={symbolFor(entry.index)}
              active={activeIndex === entry.index}
              onClick={() => onSelect(entry.index)}
              ariaLabel={`color ${symbolFor(entry.index)}`}
            />
          </div>
        ))}
        {customColors.map((hex) => (
          <div
            key={hex}
            ref={activeCustom === hex ? activeRef : undefined}
            className="flex shrink-0"
          >
            <ColorCircle
              hex={hex}
              number={null}
              active={activeCustom === hex}
              onClick={() => onSelectCustom(hex)}
              ariaLabel={hex}
            />
          </div>
        ))}
      </div>

      <label
        htmlFor="custom-color-picker"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink-faint text-ink-soft transition-colors active:border-ink active:text-ink"
        aria-label="custom color"
        title="custom color"
      >
        <IconPlus size={18} />
      </label>
      <input
        id="custom-color-picker"
        ref={colorInputRef}
        type="color"
        className="sr-only"
        onChange={(e) => onAddCustom(e.target.value)}
        aria-label="pick custom color"
      />
    </div>
  );
}
