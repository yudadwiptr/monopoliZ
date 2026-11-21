import { motion } from 'framer-motion';
import type { CardDef, MapDef } from '@/engine/types';
import { TONE_COLOR, TONE_TAG, cardEffectSummary } from '../shared/tileInfo';

/** Bolder kawung tile than the global one — it has to read on the bright blue card back. */
const KAWUNG_STRONG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.2' stroke-width='1.6'%3E%3Cellipse cx='28' cy='14' rx='7' ry='12'/%3E%3Cellipse cx='28' cy='42' rx='7' ry='12'/%3E%3Cellipse cx='14' cy='28' rx='12' ry='7'/%3E%3Cellipse cx='42' cy='28' rx='12' ry='7'/%3E%3Ccircle cx='28' cy='28' r='2.4'/%3E%3C/g%3E%3C/svg%3E\")";

/** MonopoliZ "Kartu Rezeki" card back: brand blue, kawung batik, a tilted Z badge. */
export function CardBack() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] border-2 border-white/35 bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 shadow-glow-brand">
      <div className="absolute inset-0" style={{ backgroundImage: KAWUNG_STRONG, backgroundSize: '44px 44px' }} aria-hidden />
      <div className="absolute inset-3 rounded-[1.2rem] border-2 border-dashed border-white/30" aria-hidden />
      <span className="absolute left-5 top-4 text-xl" aria-hidden>
        🎁
      </span>
      <span className="absolute bottom-4 right-5 rotate-180 text-xl" aria-hidden>
        🎁
      </span>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-24 w-24 -rotate-6 place-items-center rounded-[1.75rem] bg-gradient-to-b from-white to-brand-200 shadow-[0_10px_0_#1C5290,0_18px_30px_-8px_rgba(0,0,0,0.5)]">
            <span className="font-display text-6xl font-bold leading-none text-brand-600">Z</span>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold tracking-wide text-white drop-shadow">Kartu Rezeki</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/75">MonopoliZ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CardFrontProps {
  card: CardDef;
  map: MapDef;
  titleId?: string;
  descId?: string;
  /** Plays the emoji pop + burst once the card has turned */
  revealed: boolean;
}

export function CardFront({ card, map, titleId, descId, revealed }: CardFrontProps) {
  const color = TONE_COLOR[card.tone];
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border-2 bg-ink-800"
      style={{ borderColor: color, boxShadow: `0 0 36px -4px ${color}88, 0 20px 50px -12px rgba(0,0,0,0.7)` }}
    >
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-35 blur-3xl"
        style={{ background: color }}
        aria-hidden
      />
      <div className="batik-bg pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="relative flex items-center justify-between px-4 py-2.5"
        style={{ background: `linear-gradient(120deg, ${color}, ${color}B3)` }}
      >
        <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ink-950">Kartu Rezeki</span>
        <span className="rounded-full bg-ink-950/85 px-2.5 py-0.5 font-display text-[11px] font-semibold text-white">
          {TONE_TAG[card.tone]}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center px-5 pb-5 pt-5 text-center">
        <div className="relative">
          {revealed && card.tone !== 'bad' && <Burst color={color} />}
          <motion.div
            className="relative grid h-24 w-24 place-items-center rounded-full text-[3.6rem] leading-none"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${color}66, ${color}22 60%, transparent 75%)`,
              boxShadow: `inset 0 0 0 2px ${color}55`,
            }}
            initial={{ scale: 0.3, rotate: -20 }}
            animate={revealed ? { scale: 1, rotate: 0 } : { scale: 0.3, rotate: -20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.15 }}
            aria-hidden
          >
            {card.emoji}
          </motion.div>
        </div>
        <h2 id={titleId} className="mt-3 font-display text-2xl font-bold leading-tight text-white">
          {card.title}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-ink-200">
          {card.text}
        </p>
        <div className="mt-auto pt-4">
          <span
            className="num inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-bold"
            style={{ borderColor: `${color}66`, background: `${color}1F`, color }}
          >
            {cardEffectSummary(card, map)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Little celebratory particles flying out of the emoji. Transform/opacity only. */
function Burst({ color }: { color: string }) {
  const n = 10;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const d = 62 + (i % 3) * 14;
        return (
          <motion.span
            key={i}
            className="absolute -ml-1 -mt-1 h-2 w-2 rounded-full"
            style={{ background: i % 2 ? color : '#FFE08A' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
          />
        );
      })}
    </div>
  );
}
