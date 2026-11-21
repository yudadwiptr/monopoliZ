import { AnimatePresence, motion, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Eye, Map as MapIcon, Rocket, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { MAPS } from '@/data/maps';
import { formatRp } from '@/lib/format';
import { Button } from '@/ui/common';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { SectionHeading } from './parts/SectionHeading';
import { IconButton } from './parts/IconButton';
import { MapCard } from './parts/setup/MapCard';
import { SeatCard } from './parts/setup/SeatCard';
import { AddSeatButton } from './parts/setup/AddSeatButton';
import { RulesPanel } from './parts/setup/RulesPanel';
import {
  MAX_SEATS,
  MIN_SEATS,
  addSeat,
  humanCount,
  loadSetup,
  removeSeat,
  saveSetup,
  setSeatBot,
  setSeatCharacter,
  setSeatLevel,
  setSeatName,
  shuffleBotName,
  toConfig,
  type SetupDraft,
} from './parts/setup/setupModel';

const section: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 26, delay: 0.08 + i * 0.08 },
  }),
};

function modeLabel(humans: number): { text: string; tone: string } {
  if (humans === 0) return { text: 'Mode Nonton 👀', tone: 'bg-laut-500/20 text-laut-300 border-laut-400/30' };
  if (humans === 1) return { text: 'Solo vs Bot 🤖', tone: 'bg-brand-500/20 text-brand-200 border-brand-300/30' };
  return { text: `Mabar ${humans} orang, gantian 1 HP 📱`, tone: 'bg-gold-500/15 text-gold-300 border-gold-400/30' };
}

const STEPS = [
  { id: 'map', label: 'Peta' },
  { id: 'players', label: 'Pemain' },
  { id: 'rules', label: 'Aturan' },
] as const;

/** Phones and small tablets get a one-section-at-a-time wizard instead of one long page. */
const STEPPED_QUERY = '(max-width: 1023px), (max-height: 719px)';

function useStepped(): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(STEPPED_QUERY).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(STEPPED_QUERY);
    if (!mq) return;
    const onChange = () => setOn(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return on;
}

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  leave: (dir: number) => ({ opacity: 0, x: dir * -48, transition: { duration: 0.15 } }),
};

/** Pick map, seats and rules, then start the game. The last setup is remembered. */
export function SetupScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const startGame = useGame((s) => s.startGame);
  const [draft, setDraft] = useState<SetupDraft>(loadSetup);

  useEffect(() => saveSetup(draft), [draft]);

  const takenBy = useMemo(() => {
    const out: Record<string, number> = {};
    draft.seats.forEach((s, i) => (out[s.characterId] = i + 1));
    return out;
  }, [draft.seats]);

  const humans = humanCount(draft);
  const mode = modeLabel(humans);
  const map = MAPS.find((m) => m.id === draft.mapId);
  const canStart = !!map && !map.locked && draft.seats.length >= MIN_SEATS && draft.seats.length <= MAX_SEATS;

  const update = (fn: (d: SetupDraft) => SetupDraft) => setDraft((d) => fn(d));

  const stepped = useStepped();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };
  const stepValid = [!!map && !map.locked, draft.seats.length >= MIN_SEATS, canStart];
  const lastStep = !stepped || step === STEPS.length - 1;
  const onBack = () => (stepped && step > 0 ? go(step - 1) : setScreen('menu'));

  // Each wizard step starts at the top.
  useEffect(() => {
    document.getElementById('setup-scroll')?.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop variant="calm" skyline={false} />

      <div id="setup-scroll" className="relative z-10 h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="mx-auto w-full max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          {/* header */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx('flex items-center gap-3', stepped ? 'mb-3' : 'mb-5')}
          >
            <IconButton label={stepped && step > 0 ? 'Langkah sebelumnya' : 'Kembali ke menu'} onClick={onBack}>
              <ChevronLeft size={24} />
            </IconButton>
            <div className="min-w-0 flex-1">
              <h1 className={clsx('font-display font-bold leading-none text-white sm:text-3xl', stepped ? 'whitespace-nowrap text-xl' : 'text-2xl')}>
                Siapkan Permainan
              </h1>
              {!stepped && (
                <p className="mt-1 truncate text-xs text-ink-300 sm:text-sm">Pilih peta, kumpulin pemain, atur aturan. Gas!</p>
              )}
            </div>
            {stepped && (
              <nav aria-label="Langkah" className="flex shrink-0 items-center gap-1">
                {STEPS.map((st, i) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => i < step && go(i)}
                    aria-current={i === step ? 'step' : undefined}
                    disabled={i > step}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-full px-2 py-1 font-display text-xs font-semibold transition-colors',
                      i === step && 'bg-brand-500/25 text-white',
                      i < step && 'text-brand-200 hover:bg-white/5',
                      i > step && 'text-ink-400',
                    )}
                  >
                    <span
                      className={clsx(
                        'num flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                        i <= step ? 'bg-brand-500 text-white' : 'bg-white/10 text-ink-300',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={clsx(i === step ? 'hidden min-[420px]:inline' : 'hidden sm:inline')}>{st.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </motion.header>

          <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={stepped ? STEPS[step].id : 'all'}
            custom={dir}
            variants={stepped ? slide : undefined}
            initial={stepped ? 'enter' : false}
            animate={stepped ? 'show' : undefined}
            exit={stepped ? 'leave' : undefined}
          >
          {/* (a) map */}
          {(!stepped || step === 0) && (
          <motion.section variants={section} initial="hidden" animate="show" custom={0} aria-labelledby="setup-map">
            <SectionHeading step={1} id="setup-map" title="Pilih Peta" hint={stepped ? undefined : 'Peta lain lagi dimasak, sabar ya!'} />
            <div
              role="radiogroup"
              aria-labelledby="setup-map"
              className={clsx(
                '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 scrollbar-thin',
                !stepped && 'sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4',
              )}
            >
              {MAPS.map((m) => (
                <MapCard
                  key={m.id}
                  map={m}
                  compact={stepped}
                  selected={m.id === draft.mapId}
                  onSelect={() => update((d) => ({ ...d, mapId: m.id }))}
                />
              ))}
            </div>
          </motion.section>
          )}

          {/* (b) players */}
          {(!stepped || step === 1) && (
          <motion.section
            variants={section}
            initial="hidden"
            animate="show"
            custom={1}
            className={stepped ? undefined : 'mt-6'}
            aria-labelledby="setup-players"
          >
            <SectionHeading
              step={2}
              id="setup-players"
              title="Pemain"
              hint={stepped ? undefined : `${MIN_SEATS}–${MAX_SEATS} pemain, tiap karakter cuma satu.`}
              right={
                <span className="num flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                  <Users size={14} aria-hidden /> {draft.seats.length}/{MAX_SEATS}
                </span>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {draft.seats.map((seat, i) => (
                  <SeatCard
                    key={seat.uid}
                    seat={seat}
                    index={i}
                    takenBy={takenBy}
                    canRemove={draft.seats.length > MIN_SEATS}
                    onCharacter={(id) => update((d) => setSeatCharacter(d, seat.uid, id))}
                    onBot={(isBot) => update((d) => setSeatBot(d, seat.uid, isBot))}
                    onName={(name) => update((d) => setSeatName(d, seat.uid, name))}
                    onShuffleName={() => update((d) => shuffleBotName(d, seat.uid))}
                    onLevel={(lvl) => update((d) => setSeatLevel(d, seat.uid, lvl))}
                    onRemove={() => update((d) => removeSeat(d, seat.uid))}
                  />
                ))}
                {draft.seats.length < MAX_SEATS && (
                  <AddSeatButton
                    key="add"
                    remaining={MAX_SEATS - draft.seats.length}
                    onAdd={() => update(addSeat)}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.section>
          )}

          {/* (c) rules */}
          {(!stepped || step === 2) && (
          <motion.section
            variants={section}
            initial="hidden"
            animate="show"
            custom={2}
            className={stepped ? undefined : 'mt-6'}
            aria-labelledby="setup-rules"
          >
            <SectionHeading step={3} id="setup-rules" title="Aturan" hint={stepped ? undefined : 'Default udah pas, tapi bebas diubah.'} />
            <RulesPanel
              startCash={draft.startCash}
              maxRounds={draft.maxRounds}
              onStartCash={(v) => update((d) => ({ ...d, startCash: v }))}
              onMaxRounds={(v) => update((d) => ({ ...d, maxRounds: v }))}
            />
          </motion.section>
          )}
          </motion.div>
          </AnimatePresence>
        </div>

        {/* sticky start bar */}
        <div className={clsx('sticky bottom-0 z-20 bg-gradient-to-t from-ink-950 via-ink-950/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6', stepped ? 'mt-3 pt-5' : 'mt-6 pt-8')}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.3 }}
            className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            {lastStep && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold sm:justify-start sm:text-sm">
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white">
                <MapIcon size={13} aria-hidden /> {map?.name ?? '—'}
              </span>
              <span className="num rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-gold-300">
                {formatRp(draft.startCash)}
              </span>
              <span className="num rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white">
                {draft.maxRounds === null ? '∞ ronde' : `${draft.maxRounds} ronde`}
              </span>
              <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 ${mode.tone}`}>
                {humans === 0 && <Eye size={13} aria-hidden />}
                {mode.text}
              </span>
            </div>
            )}
            <div className={clsx('flex items-center gap-3', stepped && 'w-full sm:w-auto', stepped && !lastStep && 'sm:ml-auto')}>
              {stepped && step > 0 && (
                <Button
                  variant="glass"
                  size="lg"
                  aria-label="Kembali"
                  onClick={() => go(step - 1)}
                  icon={<ChevronLeft size={20} aria-hidden />}
                  className="shrink-0 !px-4 sm:!px-7"
                >
                  <span className="hidden sm:inline">Kembali</span>
                </Button>
              )}
              {lastStep ? (
                <Button
                  variant="primary"
                  size={stepped ? 'lg' : 'xl'}
                  disabled={!canStart}
                  onClick={() => startGame(toConfig(draft))}
                  icon={<Rocket size={24} aria-hidden />}
                  className="flex-1 whitespace-nowrap sm:flex-none"
                >
                  GAS, MULAI MAIN!
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!stepValid[step]}
                  onClick={() => go(step + 1)}
                  className="flex-1 whitespace-nowrap sm:min-w-[200px] sm:flex-none"
                >
                  Lanjut: {STEPS[step + 1].label}
                  <ChevronRight size={20} aria-hidden />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
