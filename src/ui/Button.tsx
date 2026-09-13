import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper shadow-sm active:opacity-85',
  secondary: 'bg-paper text-ink border border-paper-deep active:bg-paper-deep',
  ghost: 'text-ink-soft active:bg-paper-deep',
  danger: 'bg-accent/10 text-accent active:bg-accent/20',
};

interface ButtonProps {
  variant?: Variant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  onClick,
  disabled,
  className = '',
  children,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[opacity,background-color] disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

interface IconButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
}

/** Square toolbar button for top bars and floating stacks. */
export function IconButton({
  label,
  onClick,
  disabled,
  active,
  className = '',
  children,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${
        active ? 'bg-ink text-paper' : 'text-ink-soft active:bg-paper-deep'
      } ${className}`}
    >
      {children}
    </button>
  );
}
