import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/ui/common';
import { sfx } from '@/audio';
import { haptic } from '@/store/settingsStore';
import { mapOf } from '@/engine/selectors';
import type { GameState } from '@/engine/types';
import { CardBack, CardFront } from './card/CardFaces';
import { useActOnce, useDialogKeys } from './shared/hooks';
import { TONE_COLOR } from './shared/tileInfo';
import { safeCard } from './card/safeCard';
import type { PendingOf } from './types';

export interface CardDialogProps {
  game: GameState;
  pending: PendingOf<'card'>;
}

const FLIP_DELAY = 450;

/** Kartu Rezeki reveal: the card flies in face-down, flips, then waits for "Oke!" (→ ACK). */
export function CardDialog({ game, pending }: CardDialogProps) {
  const titleId = useId();
  const descId = useId();
  const act = useActOnce();
  const card = safeCard(pending.cardId);
  const map = mapOf(game);
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);
  const shake = useAnimationControls();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setFlipped(true);
      sfx.play('whoosh');
      haptic(14);
    }, FLIP_DELAY);
    const t2 = setTimeout(() => setReady(true), FLIP_DELAY + 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!flipped || card.tone !== 'bad') return;
    const t = setTimeout(() => void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } }), 420);
    return () => clearTimeout(t);
  }, [flipped, card.tone, shake]);

  useEffect(() => {
    if (ready) btnRef.current?.focus({ preventScroll: true });
  }, [ready]);

  const ack = () => ready && act({ type: 'ACK' });
  useDialogKeys({ enter: ack });

  const color = TONE_COLOR[card.tone];

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:justify-center sm:pb-0 sm:pt-[8dvh]">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 70% 60% at 50% 60%, ${color}26 0%, rgba(5,8,26,0.72) 55%, rgba(5,8,26,0.35) 100%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="pointer-events-auto relative flex flex-col items-center"
        initial={{ y: 220, opacity: 0, scale: 0.7, rotate: -10 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
        exit={{ y: 160, opacity: 0, scale: 0.8, rotate: 6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <motion.div animate={shake} className="w-[min(18.5rem,82vw)]" style={{ perspective: 1400 }}>
          <motion.div
            className="relative grid"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateY: 180 }}
            animate={{ rotateY: flipped ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 120, damping: 15 }}
          >
            <div
              className="min-h-[min(23rem,58dvh)]"
              style={{ gridArea: '1 / 1', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <CardFront card={card} map={map} titleId={titleId} descId={descId} revealed={flipped} />
            </div>
            <div
              className="min-h-[min(23rem,58dvh)]"
              style={{
                gridArea: '1 / 1',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              aria-hidden
            >
              <CardBack />
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-4 h-14">
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              >
                <Button
                  ref={btnRef}
                  variant="primary"
                  size="lg"
                  silent
                  onClick={ack}
                  className="min-w-[12rem]"
                  aria-keyshortcuts="Enter"
                >
                  Oke!
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
