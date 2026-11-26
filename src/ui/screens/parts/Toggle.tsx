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
        'relative flex h-11 w-[72px] shrink-0 items-center rounded-full border-2 border-[#2b1d12] p-1 outline-none transition-colors duration-200',
        'focus-visible:ring-4 focus-visible:ring-amber-500/50',
        checked
          ? 'bg-gradient-to-b from-daun-500 to-daun-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]'
          : 'bg-[#3d2514] shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]',
        className,
      )}
    >
      <span className="sr-only">{checked ? 'Aktif' : 'Mati'}</span>
      <motion.span
        className="block h-8 w-8 rounded-full border-2 border-[#2b1d12] bg-gradient-to-b from-[#fff9ea] to-[#ebd4a9] shadow-[0_2px_0_#2b1d12]"
        animate={{ x: checked ? 26 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      />
    </button>
  );
}
