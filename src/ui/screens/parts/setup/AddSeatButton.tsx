import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { forwardRef } from 'react';
import { sfx } from '@/audio';

/** Dashed "Tambah Pemain" slot shown while there is room for another seat. */
export const AddSeatButton = forwardRef<HTMLButtonElement, { onAdd(): void; remaining: number }>(function AddSeatButton(
  { onAdd, remaining },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      layout
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={() => {
        sfx.play('click');
        onAdd();
      }}
      className="group flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.03] p-4 text-ink-200 outline-none transition-colors hover:border-brand-300/60 hover:bg-brand-500/10 hover:text-white focus-visible:ring-4 focus-visible:ring-brand-300/60 sm:min-h-[300px]"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_4px_0_#1C5290] transition-transform group-hover:rotate-90">
        <Plus size={28} strokeWidth={3} aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold">Tambah Pemain</span>
      <span className="text-xs text-ink-300">Masih ada {remaining} kursi kosong</span>
    </motion.button>
  );
});
