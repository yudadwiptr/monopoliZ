import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { sfx } from '@/audio';

export type ButtonVariant = 'primary' | 'gold' | 'danger' | 'ghost' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  block?: boolean;
  silent?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-btn-brand hover:from-brand-300 hover:to-brand-500 border border-white/20',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-btn-gold hover:from-gold-200 hover:to-gold-400 border border-white/40',
  danger:
    'bg-gradient-to-b from-merah-400 to-merah-600 text-white shadow-btn-merah hover:from-merah-300 hover:to-merah-500 border border-white/20',
  ghost: 'bg-transparent text-ink-100 hover:bg-white/10 border border-transparent',
  glass: 'bg-white/10 text-white hover:bg-white/15 border border-white/15 shadow-btn-ink backdrop-blur-md',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-base rounded-2xl gap-2',
  lg: 'h-14 px-7 text-lg rounded-2xl gap-2.5',
  xl: 'h-16 px-9 text-xl rounded-3xl gap-3',
};

/**
 * Chunky, tactile game button with a 3D "press" (sinks on tap).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, children, className, block, disabled, silent, onClick, ...rest },
  ref,
) {
  const pressable = variant !== 'ghost';
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={disabled ? undefined : pressable ? { y: 4, scale: 0.98, boxShadow: '0 1px 0 rgba(0,0,0,0.5)' } : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={(e) => {
        if (!silent) sfx.play('click');
        onClick?.(e);
      }}
      className={clsx(
        'relative inline-flex select-none items-center justify-center font-display font-semibold tracking-wide',
        'outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60 disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      {children}
    </motion.button>
  );
});
