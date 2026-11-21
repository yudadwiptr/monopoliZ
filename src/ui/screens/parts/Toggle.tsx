import { motion } from 'framer-motion';
import clsx from 'clsx';
import { sfx } from '@/audio';

export interface ToggleProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  className?: string;
}

/** Chunky on/off switch (role="switch"). */
export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        sfx.play('click');
        onChange(!checked);
      }}
      className={clsx(
        'relative flex h-11 w-[72px] shrink-0 items-center rounded-full p-1 outline-none transition-colors duration-200',
        'focus-visible:ring-4 focus-visible:ring-brand-300/60',
        checked
          ? 'bg-gradient-to-b from-daun-500 to-daun-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'
          : 'bg-ink-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]',
        className,
      )}
    >
      <span className="sr-only">{checked ? 'Aktif' : 'Mati'}</span>
      <motion.span
        className="block h-9 w-9 rounded-full bg-gradient-to-b from-white to-ink-200 shadow-[0_3px_0_rgba(0,0,0,0.25),0_6px_12px_rgba(0,0,0,0.35)]"
        animate={{ x: checked ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      />
    </button>
  );
}
