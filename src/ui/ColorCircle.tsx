import { yiqLuma, hexToRgb } from '../engine/colorSpace';

export function digitColorFor(hex: string): '#1c1917' | '#ffffff' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  return yiqLuma(rgb[0], rgb[1], rgb[2]) >= 128 ? '#1c1917' : '#ffffff';
}

interface Props {
  hex: string;
  number?: number | string | null;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function ColorCircle({ hex, number, active, onClick, ariaLabel }: Props) {
  const digit = digitColorFor(hex);
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative flex shrink-0 items-center justify-center rounded-full transition-transform ${
        active ? 'h-14 w-14 ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'h-11 w-11'
      }`}
      style={{
        backgroundColor: hex,
        boxShadow: 'inset 0 -2px 4px rgb(28 25 23 / 0.18), inset 0 2px 3px rgb(255 255 255 / 0.35)',
      }}
      title={number != null ? String(number) : hex}
    >
      {number != null && (
        <span
          className="pointer-events-none select-none font-bold"
          style={{ color: digit, fontSize: active ? 18 : 15 }}
        >
          {number}
        </span>
      )}
    </button>
  );
}
