import { Gauge, Hourglass, Rabbit, Turtle, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatRp } from '@/lib/format';
import { SPEED_LABEL, useSettings, type GameSpeed } from '@/store/settingsStore';
import { Segmented, type SegOption } from '../Segmented';
import { ROUND_OPTIONS, START_CASH_OPTIONS } from './setupModel';

const CASH_OPTIONS: SegOption<number>[] = START_CASH_OPTIONS.map((v) => ({ value: v, label: formatRp(v) }));

const ROUNDS: SegOption<number | null>[] = ROUND_OPTIONS.map((v) => ({
  value: v,
  label: v === null ? 'Tanpa Batas' : String(v),
  ariaLabel: v === null ? 'Tanpa batas ronde' : `${v} ronde`,
}));

const SPEEDS: SegOption<GameSpeed>[] = [
  { value: 'santai', label: SPEED_LABEL.santai, icon: <Turtle size={16} aria-hidden /> },
  { value: 'normal', label: SPEED_LABEL.normal, icon: <Gauge size={16} aria-hidden /> },
  { value: 'ngebut', label: SPEED_LABEL.ngebut, icon: <Rabbit size={16} aria-hidden /> },
];

function RuleRow({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,15rem)_1fr] md:items-center md:gap-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-300">{icon}</span>
        <div>
          <div className="font-display text-base font-semibold text-white">{title}</div>
          <div className="text-xs text-ink-300">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export interface RulesPanelProps {
  startCash: number;
  maxRounds: number | null;
  onStartCash(v: number): void;
  onMaxRounds(v: number | null): void;
}

/** Starting cash, round limit and animation speed. */
export function RulesPanel({ startCash, maxRounds, onStartCash, onMaxRounds }: RulesPanelProps) {
  const speed = useSettings((s) => s.speed);
  const setSpeed = useSettings((s) => s.setSpeed);

  return (
    <div className="glass space-y-5 p-4 sm:p-5">
      <RuleRow icon={<Wallet size={20} aria-hidden />} title="Modal Awal" hint="Duit tiap pemain di awal game.">
        <Segmented options={CASH_OPTIONS} value={startCash} onChange={onStartCash} ariaLabel="Modal awal" accent="gold" />
      </RuleRow>
      <RuleRow
        icon={<Hourglass size={20} aria-hidden />}
        title="Batas Ronde"
        hint="Ronde habis? Yang paling tajir menang."
      >
        <Segmented options={ROUNDS} value={maxRounds} onChange={onMaxRounds} ariaLabel="Batas ronde" />
      </RuleRow>
      <RuleRow icon={<Gauge size={20} aria-hidden />} title="Kecepatan Animasi" hint="Bisa diubah lagi pas main.">
        <Segmented options={SPEEDS} value={speed} onChange={setSpeed} ariaLabel="Kecepatan animasi" accent="laut" />
      </RuleRow>
    </div>
  );
}
