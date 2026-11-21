import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { speedFactor } from '@/store/settingsStore';
import { Avatar } from '@/ui/common';

interface BannerState {
  key: number;
  playerId: string;
  round: number;
}

/** Sweeping full-width "Giliran X!" banner on every turn_start. Non-blocking (pointer-events none). */
export function TurnBanner() {
  const event = useGame((s) => s.currentEvent);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const seq = useRef(0);
  const timer = useRef<number>();

  useEffect(() => {
    if (event?.type !== 'turn_start') return;
    const g = useGame.getState().game;
    const p = g?.players.find((x) => x.id === event.playerId);
    const humans = g?.players.filter((x) => !x.isBot).length ?? 0;
    const hotseat = !!p && !p.isBot && humans >= 2;
    seq.current += 1;
    const next = { key: seq.current, playerId: event.playerId, round: event.round };
    setBanner(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setBanner((cur) => (cur?.key === next.key ? null : cur)),
      (hotseat ? 1600 : 760) * speedFactor(),
    );
  }, [event]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const player = useGame((s) => (banner ? s.game?.players.find((p) => p.id === banner.playerId) : undefined));
  const humans = useGame((s) => s.game?.players.filter((p) => !p.isBot).length ?? 0);

  const show = banner && player;
  const hotseat = !!player && !player.isBot && humans >= 2;
  const solo = !!player && !player.isBot && humans === 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[36%] z-40 flex justify-center" aria-live="polite">
      <AnimatePresence>
        {show && (
          <motion.div
            key={banner.key}
            className="relative w-full py-3"
            initial={{ x: '-105%' }}
            animate={{ x: '0%' }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {/* band */}
            <div
              className="absolute inset-0 -skew-y-2"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${player.color}D9 14%, ${player.color}F2 50%, ${player.color}D9 86%, transparent 100%)`,
              }}
            />
            <div className="absolute inset-x-0 top-0 h-px -skew-y-2 bg-white/60" />
            <div className="batik-bg absolute inset-0 -skew-y-2 opacity-60 mix-blend-overlay" />

            <motion.div
              className="relative flex items-center justify-center gap-3 px-4 sm:gap-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.05 }}
            >
              <Avatar characterId={player.characterId} size={56} className="drop-shadow-xl" />
              <div className="min-w-0 text-ink-950">
                <div className="font-display text-xs font-bold uppercase tracking-[0.25em] opacity-70 sm:text-sm">
                  Ronde {banner.round}
                  {player.isBot ? ' · Bot' : ''}
                </div>
                <div className="truncate pb-1 font-display text-3xl font-bold leading-[1.2] drop-shadow-[0_2px_0_rgba(255,255,255,0.35)] sm:text-5xl sm:leading-[1.2]">
                  {solo ? 'Giliran kamu, gas!' : `Giliran ${player.name}!`}
                </div>
                {hotseat && (
                  <div className="mt-0.5 font-display text-sm font-semibold sm:text-base">📱 Oper HP-nya ke {player.name}!</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
