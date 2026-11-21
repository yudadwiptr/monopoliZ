import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { GameEvent } from '@/engine/types';
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

function statusFor(ev: GameEvent | null): string | null {
  switch (ev?.type) {
    case 'dice':
      return '🎲 Dadunya lagi muter…';
    case 'move':
      return ev.mode === 'fly' ? '✈️ Terbang dulu…' : '👣 Jalan dulu…';
    case 'transfer':
      return '💸 Transaksi jalan…';
    case 'card':
      return '🎁 Buka Kartu Rezeki…';
    default:
      return null;
  }
}

const swap = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.96 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 30 },
};

export interface ActionDockProps {
  layout: 'row' | 'stack';
  compact?: boolean;
  dense?: boolean;
}

/**
 * Bottom action area: dice "Gas Meter" on the human's roll, "lagi mikir…" on a bot's turn, a subtle
 * status line while things animate. Other decisions are rendered by the DecisionLayer.
 */
export function ActionDock({ layout, compact, dense }: ActionDockProps) {
  const pending = useHumanPending();
  const current = useGame((s) => (s.game && !s.game.winner ? s.game.players[s.game.current] : undefined));
  const busy = useGame((s) => s.busy);
  const paused = useGame((s) => s.paused);
  const event = useGame((s) => s.currentEvent);
  const humans = useHumanCount();

  let key = 'none';
  let content: React.ReactNode = null;

  if (current && !paused) {
    if (current.isBot) {
      key = `bot-${current.id}`;
      content = (
        <div
          className={clsx(
            'glass flex max-w-full items-center gap-2.5 !rounded-full py-1.5 pl-1.5 pr-4',
            busy && 'opacity-80',
          )}
          role="status"
        >
          <Avatar characterId={current.characterId} size={compact ? 30 : 38} active />
          <span className={clsx('min-w-0 font-display font-medium text-ink-100', compact ? 'text-sm leading-tight' : 'text-base')}>
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
          layout={layout}
          compact={compact}
          dense={dense}
          player={humans >= 2 ? { name: current.name, characterId: current.characterId } : null}
        />
      );
    } else if (busy) {
      const text = statusFor(event);
      if (text) {
        key = 'status';
        content = (
          <span className="rounded-full bg-ink-950/40 px-3 py-1 text-sm font-medium text-ink-300 backdrop-blur-sm" role="status">
            {text}
          </span>
        );
      }
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {content && (
          <motion.div key={key} className="flex w-full justify-center" {...swap}>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
