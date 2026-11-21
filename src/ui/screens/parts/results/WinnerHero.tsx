import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Avatar } from '@/ui/common';
import { sfx } from '@/audio';
import { WIN_REASON_LABEL } from '@/engine/selectors';
import type { PlayerState, WinReason } from '@/engine/types';
import { alpha } from '../color';

export interface WinnerHeroProps {
  player: PlayerState;
  reason: WinReason | null;
  caption: string;
  onCelebrate(): void;
}

const pop = (delay: number) => ({
  initial: { opacity: 0, y: 16, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 22, delay },
});

/** Big crowned avatar with rotating rays, the winner's name and how they won. */
export function WinnerHero({ player, reason, caption, onCelebrate }: WinnerHeroProps) {
  return (
    <div className="relative flex flex-col items-center pt-6 text-center">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[130px] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `repeating-conic-gradient(${alpha(player.color, 0.28)} 0deg 9deg, rgba(255,194,31,0.12) 9deg 18deg, transparent 18deg 30deg)`,
            WebkitMaskImage: 'radial-gradient(closest-side, #000 30%, transparent 100%)',
            maskImage: 'radial-gradient(closest-side, #000 30%, transparent 100%)',
            animation: 'mz-rays 40s linear infinite',
          }}
        />
      </div>

      <motion.button
        type="button"
        onClick={() => {
          sfx.play('win', { volume: 0.6 });
          onCelebrate();
        }}
        aria-label={`Rayakan kemenangan ${player.name} lagi`}
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
        className="relative mt-10 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-gold-300/60"
      >
        <motion.span
          aria-hidden
          className="absolute -top-14 left-1/2 -ml-8 block w-16 text-center text-6xl"
          initial={{ y: -90, opacity: 0, rotate: -25 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 11, delay: 0.75 }}
        >
          <span className="block" style={{ animation: 'mz-bob 2.6s ease-in-out 1.6s infinite' }}>
            👑
          </span>
        </motion.span>
        <Avatar characterId={player.characterId} size={132} active />
      </motion.button>

      <motion.div {...pop(0.45)} className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-gold-300">
        Pemenang
      </motion.div>
      <motion.h1
        {...pop(0.55)}
        className="text-gradient-gold max-w-full break-words font-display text-4xl font-bold leading-tight sm:text-5xl"
      >
        {player.name}
      </motion.h1>
      {reason && (
        <motion.div
          {...pop(0.65)}
          className="mt-2 flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-500/15 px-3.5 py-1.5 font-display text-sm font-semibold text-gold-200"
        >
          <Trophy size={16} aria-hidden /> {WIN_REASON_LABEL[reason]}
        </motion.div>
      )}
      <motion.p {...pop(0.75)} className="mt-3 max-w-xs text-sm text-ink-200">
        {caption}
      </motion.p>
    </div>
  );
}
