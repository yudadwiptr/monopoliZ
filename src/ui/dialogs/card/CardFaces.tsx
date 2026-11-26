import { motion } from 'framer-motion';
import type { CardDef, MapDef } from '@/engine/types';
import { TONE_COLOR, TONE_TAG, cardEffectSummary } from '../shared/tileInfo';

/** Golden kawung batik motif for the 2D wooden & gold Kartu Rezeki back. */
const KAWUNG_GOLD =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23fcd34d' stroke-opacity='0.22' stroke-width='1.8'%3E%3Cellipse cx='28' cy='14' rx='7' ry='12'/%3E%3Cellipse cx='28' cy='42' rx='7' ry='12'/%3E%3Cellipse cx='14' cy='28' rx='12' ry='7'/%3E%3Cellipse cx='42' cy='28' rx='12' ry='7'/%3E%3Ccircle cx='28' cy='28' r='2.4'/%3E%3C/g%3E%3C/svg%3E\")";

const TONE_PALETTE: Record<
  CardDef['tone'],
  { headerBg: string; pillBg: string; pillText: string; badgeBg: string; badgeBorder: string; badgeText: string }
> = {
  good: {
    headerBg: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
    pillBg: '#dcfce7',
    pillText: '#14532d',
    badgeBg: '#dcfce7',
    badgeBorder: '#15803d',
    badgeText: '#14532d',
  },
  bad: {
    headerBg: 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)',
    pillBg: '#ffe4e6',
    pillText: '#881337',
    badgeBg: '#ffe4e6',
    badgeBorder: '#be123c',
    badgeText: '#9f1239',
  },
  neutral: {
    headerBg: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
    pillBg: '#fef3c7',
    pillText: '#78350f',
    badgeBg: '#fef3c7',
    badgeBorder: '#b45309',
    badgeText: '#92400e',
  },
};

/** 2D Hand-Drawn "Kartu Rezeki" card back: carved dark wood, ornate golden frame, Kawung motif & Chibi Rezeki icon. */
export function CardBack() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[1.75rem] border-[3.5px] border-[#2b1d12] p-2.5"
      style={{
        background: 'linear-gradient(165deg, #8c5220 0%, #5c3412 52%, #3d210a 100%)',
        boxShadow: '0 8px 0 #2b1d12, 0 22px 48px -10px rgba(0,0,0,0.75)',
      }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: KAWUNG_GOLD, backgroundSize: '44px 44px' }} aria-hidden />
      <div
        className="relative flex h-full w-full flex-col items-center justify-between rounded-[1.25rem] border-2 border-[#f59e0b]/80 p-4"
        style={{
          background: 'radial-gradient(circle at 50% 42%, rgba(251,191,36,0.22) 0%, rgba(43,29,18,0.45) 100%)',
          boxShadow: 'inset 0 0 0 2px rgba(43,29,18,0.7)',
        }}
      >
        <div className="flex w-full items-center justify-between text-lg" aria-hidden>
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#2b1d12] bg-[#fbbf24] text-xs font-black text-[#2b1d12]">
            ★
          </span>
          <span className="font-display text-[10px] font-black uppercase tracking-[0.28em] text-[#fde68a]">
            Nusantara
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#2b1d12] bg-[#fbbf24] text-xs font-black text-[#2b1d12]">
            ★
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className="grid h-28 w-28 place-items-center rounded-full border-[3px] border-[#2b1d12] p-2"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fffbeb 0%, #fde68a 60%, #f59e0b 100%)',
              boxShadow: '0 6px 0 #2b1d12, 0 0 24px rgba(251,191,36,0.45)',
            }}
          >
            <img
              src="/icons/icon_kartu_rezeki.png"
              alt=""
              className="h-20 w-20 object-contain drop-shadow"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="text-center">
            <div className="inline-block rounded-xl border-2 border-[#2b1d12] bg-gradient-to-b from-[#fef3c7] to-[#f59e0b] px-4 py-1 shadow-[0_3px_0_#2b1d12]">
              <p className="font-display text-xl font-black tracking-wide text-[#2b1d12]">KARTU REZEKI</p>
            </div>
            <p className="mt-1.5 font-display text-[11px] font-extrabold uppercase tracking-[0.32em] text-[#fde68a]">
              MonopoliZ
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-between text-lg" aria-hidden>
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#2b1d12] bg-[#fbbf24] text-xs font-black text-[#2b1d12]">
            ★
          </span>
          <span className="h-1 w-16 rounded-full bg-[#f59e0b]/50" />
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#2b1d12] bg-[#fbbf24] text-xs font-black text-[#2b1d12]">
            ★
          </span>
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

/** 2D Hand-Drawn Parchment & Wood Kartu Rezeki front face. */
export function CardFront({ card, map, titleId, descId, revealed }: CardFrontProps) {
  const color = TONE_COLOR[card.tone];
  const pal = TONE_PALETTE[card.tone];
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border-[3.5px] border-[#2b1d12] p-2 text-[#2b1d12]"
      style={{
        background: 'linear-gradient(180deg, #7c4d25 0%, #5c3718 55%, #462810 100%)',
        boxShadow: '0 8px 0 #2b1d12, 0 22px 48px -10px rgba(0,0,0,0.75)',
      }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.3rem] border-2 border-[#8c6239]"
        style={{
          background: 'linear-gradient(180deg, #fff9ea 0%, #f5e6c8 58%, #ebd4a9 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.75)',
        }}
      >
        {/* Top ribbon header */}
        <div
          className="relative flex items-center justify-between border-b-2 border-[#2b1d12] px-3.5 py-2.5"
          style={{ background: pal.headerBg }}
        >
          <span
            className="font-display text-xs font-black uppercase tracking-[0.18em] text-white"
            style={{ textShadow: '0 1.5px 0 #2b1d12' }}
          >
            Kartu Rezeki
          </span>
          <span
            className="rounded-full border-[1.5px] border-[#2b1d12] px-2.5 py-0.5 font-display text-[11px] font-black shadow-[0_1.5px_0_#2b1d12]"
            style={{ background: pal.pillBg, color: pal.pillText }}
          >
            {TONE_TAG[card.tone]}
          </span>
        </div>

        {/* Parchment body */}
        <div className="relative flex flex-1 flex-col items-center px-4 pb-4 pt-4 text-center">
          <div className="relative">
            {revealed && card.tone !== 'bad' && <Burst color={color} />}
            <motion.div
              className="relative grid h-24 w-24 place-items-center rounded-full border-[2.5px] border-[#2b1d12] bg-[#fff8e7] text-[3.4rem] leading-none shadow-[0_4px_0_#8c6239]"
              initial={{ scale: 0.3, rotate: -20 }}
              animate={revealed ? { scale: 1, rotate: 0 } : { scale: 0.3, rotate: -20 }}
              transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.15 }}
              aria-hidden
            >
              {card.emoji}
            </motion.div>
          </div>

          {/* Scroll Banner Title */}
          <div className="mt-3 w-full rounded-xl border-2 border-[#8c6239] bg-[#fff8e7] px-3 py-1.5 shadow-[0_2px_0_rgba(140,98,57,0.3)]">
            <h2 id={titleId} className="font-display text-xl font-black leading-tight text-[#2b1d12]">
              {card.title}
            </h2>
          </div>

          <p id={descId} className="mt-2.5 text-sm font-semibold leading-relaxed text-[#4a3525]">
            {card.text}
          </p>

          <div className="mt-auto pt-3">
            <span
              className="num inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-sm font-black shadow-[0_2px_0_rgba(43,29,18,0.2)]"
              style={{
                borderColor: pal.badgeBorder,
                background: pal.badgeBg,
                color: pal.badgeText,
              }}
            >
              {cardEffectSummary(card, map)}
            </span>
          </div>
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
            className="absolute -ml-1 -mt-1 h-2.5 w-2.5 rounded-full border border-[#2b1d12]"
            style={{ background: i % 2 ? color : '#FBBF24' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
          />
        );
      })}
    </div>
  );
}
