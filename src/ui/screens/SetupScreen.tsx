import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ChevronLeft, Eye, Map as MapIcon, Rocket, Users } from 'lucide-react';
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop variant="calm" skyline={false} />

      <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="mx-auto w-full max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          {/* header */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3"
          >
            <IconButton label="Kembali ke menu" onClick={() => setScreen('menu')}>
              <ChevronLeft size={24} />
            </IconButton>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-none text-white sm:text-3xl">Siapkan Permainan</h1>
              <p className="mt-1 truncate text-xs text-ink-300 sm:text-sm">Pilih peta, kumpulin pemain, atur aturan. Gas!</p>
            </div>
          </motion.header>

          {/* (a) map */}
          <motion.section variants={section} initial="hidden" animate="show" custom={0} aria-labelledby="setup-map">
            <SectionHeading step={1} id="setup-map" title="Pilih Peta" hint="Peta lain lagi dimasak, sabar ya!" />
            <div
              role="radiogroup"
              aria-labelledby="setup-map"
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
            >
              {MAPS.map((m) => (
                <MapCard
                  key={m.id}
                  map={m}
                  selected={m.id === draft.mapId}
                  onSelect={() => update((d) => ({ ...d, mapId: m.id }))}
                />
              ))}
            </div>
          </motion.section>

          {/* (b) players */}
          <motion.section
            variants={section}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6"
            aria-labelledby="setup-players"
          >
            <SectionHeading
              step={2}
              id="setup-players"
              title="Pemain"
              hint={`${MIN_SEATS}–${MAX_SEATS} pemain, tiap karakter cuma satu.`}
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

          {/* (c) rules */}
          <motion.section
            variants={section}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-6"
            aria-labelledby="setup-rules"
          >
            <SectionHeading step={3} id="setup-rules" title="Aturan" hint="Default udah pas, tapi bebas diubah." />
            <RulesPanel
              startCash={draft.startCash}
              maxRounds={draft.maxRounds}
              onStartCash={(v) => update((d) => ({ ...d, startCash: v }))}
              onMaxRounds={(v) => update((d) => ({ ...d, maxRounds: v }))}
            />
          </motion.section>
        </div>

        {/* sticky start bar */}
        <div className="sticky bottom-0 z-20 mt-6 bg-gradient-to-t from-ink-950 via-ink-950/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.3 }}
            className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
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
            <Button
              variant="primary"
              size="xl"
              disabled={!canStart}
              onClick={() => startGame(toConfig(draft))}
              icon={<Rocket size={24} aria-hidden />}
              className="w-full sm:w-auto"
            >
              GAS, MULAI MAIN!
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
