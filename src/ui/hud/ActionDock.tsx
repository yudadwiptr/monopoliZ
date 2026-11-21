import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useGame, useHumanPending } from '@/store/gameStore';
import { Avatar } from '@/ui/common';
import { DiceRoller } from './DiceRoller';
import { useHumanCount } from './hooks';

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-end gap-0.5', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-current"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

const swap = {
  initial: { opacity: 0, y: 10, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
};

export interface ActionDockProps {
  /** Smaller controls for short screens */
  compact?: boolean;
}

/**
 * The action spot in the middle of the board: the round LEMPAR button (with Genap/Ganjil) on a human's
 * roll, a "lagi mikir" pill on a bot's turn. Hidden while things animate, so it never covers the dice.
 * Other decisions are rendered by the DecisionLayer.
 */
export function ActionDock({ compact }: ActionDockProps) {
  const pending = useHumanPending();
  const current = useGame((s) => (s.game && !s.game.winner ? s.game.players[s.game.current] : undefined));
  const busy = useGame((s) => s.busy);
  const paused = useGame((s) => s.paused);
  const humans = useHumanCount();

  let key = 'none';
  let content: React.ReactNode = null;

  if (current && !paused && !busy) {
    if (current.isBot) {
      key = `bot-${current.id}`;
      content = (
        <div className="glass flex items-center gap-2.5 !rounded-full py-1.5 pl-1.5 pr-4" role="status">
          <Avatar characterId={current.characterId} size={compact ? 28 : 34} active />
          <span className={clsx('font-display font-medium text-ink-100', compact ? 'text-xs' : 'text-sm')}>
            <span className="font-semibold" style={{ color: current.color }}>
              {current.name}
            </span>{' '}
            lagi mikir
            <ThinkingDots className="ml-1 text-ink-200" />
          </span>
        </div>
      );
    } else if (pending?.kind === 'roll') {
      key = `roll-${current.id}`;
      content = (
        <DiceRoller
          compact={compact}
          player={humans >= 2 ? { name: current.name, characterId: current.characterId } : null}
        />
      );
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {content && (
        <motion.div key={key} className="flex justify-center" {...swap}>
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
