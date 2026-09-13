import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper shadow-sm active:opacity-85',
  secondary: 'bg-paper text-ink border border-paper-deep active:bg-paper-deep',
  ghost: 'text-ink-soft active:bg-paper-deep',
  danger: 'bg-accent/10 text-accent active:bg-accent/20',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[opacity,background-color] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:cursor-not-allowed';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: Variant;
  className?: string;
  onClick?: () => void;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function (
  { variant = 'primary', onClick, disabled, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${VARIANTS[variant]} px-4 py-2.5 ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children' | 'onClick'
> {
  label: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/** Square toolbar button for top bars and floating stacks. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function (
  { label, onClick, disabled, active, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${
        active ? 'bg-ink text-paper' : 'text-ink-soft active:bg-paper-deep'
      } ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
});
IconButton.displayName = 'IconButton';
