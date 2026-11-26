import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/ui/common';
import { useGame } from '@/store/gameStore';
import { speedFactor } from '@/store/settingsStore';
import { mapOf } from '@/engine/selectors';
import { safeCard } from './card/safeCard';
import { TONE_COLOR, cardEffectSummary } from './shared/tileInfo';

interface Reveal {
  key: number;
  cardId: string;
  playerId: string;
}

/**
 * Non-blocking peek at the Kartu Rezeki a BOT just drew, so humans can follow along.
 * Sits under the top HUD for ~1.5 s; never catches pointer events.
 */
export function BotCardReveal() {
  const ev = useGame((s) => s.currentEvent);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!ev || ev.type !== 'card') return;
    const player = useGame.getState().game?.players.find((p) => p.id === ev.playerId);
    if (!player?.isBot) return;
    const key = ++seq.current;
    setReveal({ key, cardId: ev.cardId, playerId: ev.playerId });
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setReveal((r) => (r?.key === key ? null : r)),
      Math.max(1300, 1700 * speedFactor()),
    );
  }, [ev]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-40 flex justify-center px-4 sm:top-[calc(env(safe-area-inset-top)+5.5rem)]"
      aria-live="polite"
    >
      <AnimatePresence>{reveal && <RevealCard key={reveal.key} reveal={reveal} />}</AnimatePresence>
    </div>
  );
}

function RevealCard({ reveal }: { reveal: Reveal }) {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const card = safeCard(reveal.cardId);
  const player = game.players.find((p) => p.id === reveal.playerId);
  const toneText = card.tone === 'good' ? '#15803d' : card.tone === 'bad' ? '#b91c1c' : '#b45309';
  const color = TONE_COLOR[card.tone];
  return (
    <div style={{ perspective: 900 }} className="w-full max-w-sm">
      <motion.div
        className="flex items-center gap-3 rounded-2xl border-[3px] border-[#2b1d12] p-2.5 pr-4 text-[#2b1d12]"
        style={{
          background: 'linear-gradient(180deg, #fff9ea 0%, #f5e6c8 60%, #ebd4a9 100%)',
          boxShadow: '0 5px 0 #2b1d12, 0 14px 35px -8px rgba(0,0,0,0.65)',
        }}
        initial={{ rotateX: -90, opacity: 0, y: -16 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        exit={{ rotateX: 70, opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      >
        <div
          className="grid h-14 w-12 shrink-0 place-items-center rounded-xl border-2 border-[#2b1d12] bg-[#fff8e7] text-3xl leading-none shadow-[0_2px_0_#8c6239]"
          style={{ boxShadow: `inset 0 0 0 2px ${color}66` }}
          aria-hidden
        >
          {card.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#5c4028]">
            {player && <Avatar characterId={player.characterId} size={18} ring={false} />}
            <span className="truncate">{player?.name ?? 'Bot'} dapat Kartu Rezeki</span>
          </div>
          <p className="truncate font-display text-base font-black leading-tight text-[#2b1d12]">{card.title}</p>
          <p className="num truncate text-xs font-extrabold" style={{ color: toneText }}>
            {cardEffectSummary(card, mapOf(game))}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
