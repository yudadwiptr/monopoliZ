import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Focus, Gauge, Grid2x2, Pause, Rabbit, Turtle, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '@/store/gameStore';
import { SPEED_LABEL, useSettings, type GameSpeed } from '@/store/settingsStore';
import { Logo } from '@/ui/common';
import { IconButton } from './IconButton';
import { useMapDef } from './hooks';

export type TopBarVariant = 'wide' | 'compact' | 'stack' | 'mini' | 'floating';

const SPEED_ORDER: GameSpeed[] = ['santai', 'normal', 'ngebut'];
const SPEED_ICON: Record<GameSpeed, React.ReactNode> = {
  santai: <Turtle size={18} aria-hidden />,
  normal: <Gauge size={18} aria-hidden />,
  ngebut: <Rabbit size={18} aria-hidden />,
};

const UNMUTE_KEY = 'monopoliz.hud.unmute';
const DEFAULT_VOLUMES = { sfx: 0.7, music: 0.35 };

function readUnmute(): { sfx: number; music: number } {
  try {
    const raw = localStorage.getItem(UNMUTE_KEY);
    if (!raw) return DEFAULT_VOLUMES;
    const v = JSON.parse(raw) as { sfx?: unknown; music?: unknown };
    const sfx = typeof v.sfx === 'number' && v.sfx > 0 ? v.sfx : DEFAULT_VOLUMES.sfx;
    const music = typeof v.music === 'number' && v.music > 0 ? v.music : DEFAULT_VOLUMES.music;
    return { sfx, music };
  } catch {
    return DEFAULT_VOLUMES;
  }
}

function toggleMute() {
  const s = useSettings.getState();
  const muted = s.sfxVolume === 0 && s.musicVolume === 0;
  if (muted) {
    const v = readUnmute();
    s.setSfxVolume(v.sfx);
    s.setMusicVolume(v.music);
    return;
  }
  try {
    localStorage.setItem(
      UNMUTE_KEY,
      JSON.stringify({ sfx: s.sfxVolume || DEFAULT_VOLUMES.sfx, music: s.musicVolume || DEFAULT_VOLUMES.music }),
    );
  } catch {
    /* storage may be unavailable */
  }
  s.setSfxVolume(0);
  s.setMusicVolume(0);
}

function RoundPill({ compact, mini }: { compact?: boolean; mini?: boolean }) {
  const round = useGame((s) => s.game?.round ?? 1);
  const maxRounds = useGame((s) => s.game?.config.maxRounds ?? null);
  const map = useMapDef();
  const final = maxRounds !== null && round >= maxRounds - 1;
  const progress = maxRounds ? Math.min(1, round / maxRounds) : 0;

  if (mini) {
    return (
      <div
        className="relative flex items-center gap-1.5 overflow-hidden rounded-full border-2 border-[#4a3525] px-3 py-1 font-display text-xs font-black shadow-[0_2px_0_#1a110b] sm:text-[13px]"
        style={{
          background: final
            ? 'linear-gradient(180deg, #fecaca 0%, #f87171 100%)'
            : 'linear-gradient(180deg, #fff8e7 0%, #fde68a 100%)',
          color: '#1e130c',
        }}
        aria-label={`Ronde ${round}${maxRounds ? ` dari ${maxRounds}` : ''}`}
      >
        <span aria-hidden className="text-sm leading-none">
          {map?.theme.emblem ?? '🏆'}
        </span>
        <span className="uppercase tracking-wider text-[#5c4028]">Ronde</span>
        <span className={clsx('num text-sm font-black sm:text-base', final ? 'text-[#991b1b]' : 'text-[#b45309]')}>
          {round}
          {maxRounds !== null && <span className="text-[#4a3525]">/{maxRounds}</span>}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border-2 border-[#4a3525] shadow-[0_3px_0_#1a110b]',
        compact ? 'h-9 px-2.5' : 'h-11 px-3',
      )}
      style={{
        background: 'linear-gradient(180deg, #fff8e7 0%, #f5deb3 100%)',
        color: '#1e130c',
      }}
      aria-label={`Ronde ${round}${maxRounds ? ` dari ${maxRounds}` : ''}, peta ${map?.name ?? ''}`}
    >
      {map && (
        <span className={clsx('shrink-0 leading-none', compact ? 'text-base' : 'text-xl')} aria-hidden>
          {map.theme.emblem}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <div className="flex items-baseline gap-1 whitespace-nowrap font-display font-black">
          <span className={clsx('uppercase tracking-wider text-[#5c4028]', compact ? 'text-[11px]' : 'text-xs')}>
            Ronde
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={round}
              className={clsx(
                'num inline-block font-black',
                compact ? 'text-sm' : 'text-base',
                final ? 'text-[#dc2626]' : 'text-[#b45309]',
              )}
              initial={{ scale: 1.6, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {round}
            </motion.span>
          </AnimatePresence>
          {maxRounds !== null && (
            <span className={clsx('num font-extrabold text-[#4a3525]', compact ? 'text-xs' : 'text-sm')}>
              /{maxRounds}
            </span>
          )}
        </div>
      </div>
      {maxRounds !== null && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-[#4a3525]/20" aria-hidden>
          <motion.div
            className={clsx('h-full w-full origin-left rounded-full', final ? 'bg-[#dc2626]' : 'bg-[#d97706]')}
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

const WOOD_BTN =
  '!bg-[#4a3525] hover:!bg-[#5c4028] !text-[#fff8e7] !border-[1.5px] !border-[#f5deb3]/85 !shadow-[0_2px_0_#1a110b]';

export function TopBar({ variant }: { variant: TopBarVariant }) {
  const speed = useSettings((s) => s.speed);
  const followCam = useSettings((s) => s.followCam);
  const muted = useSettings((s) => s.sfxVolume === 0 && s.musicVolume === 0);

  const cycleSpeed = () => {
    const i = SPEED_ORDER.indexOf(speed);
    useSettings.getState().setSpeed(SPEED_ORDER[(i + 1) % SPEED_ORDER.length]);
  };
  const toggleCameraMode = () => {
    const cur = useSettings.getState().followCam;
    useSettings.getState().setCamera('top');
    useSettings.getState().setFollowCam(!cur);
  };
  const pause = () => useGame.getState().setPaused(true);

  const wide = variant === 'wide';
  const tip = variant !== 'stack';
  const cameraModeLabel = followCam ? 'Mode Fokus (Auto-Zoom)' : 'Mode Utuh (Penuh)';

  const buttons = (
    <>
      <IconButton
        label={`Kecepatan: ${SPEED_LABEL[speed]} (ketuk untuk ganti)`}
        icon={SPEED_ICON[speed]}
        text={wide ? SPEED_LABEL[speed] : undefined}
        onClick={cycleSpeed}
        tip={tip}
        className={WOOD_BTN}
      />
      <IconButton
        label={`Kamera: ${cameraModeLabel} (ketuk untuk ganti)`}
        icon={followCam ? <Focus size={18} aria-hidden className="text-[#fde68a]" /> : <Grid2x2 size={18} aria-hidden />}
        text={wide ? (followCam ? 'Fokus' : 'Utuh') : undefined}
        onClick={toggleCameraMode}
        pressed={followCam}
        tip={tip}
        className={WOOD_BTN}
      />
      <IconButton
        label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
        icon={muted ? <VolumeX size={17} aria-hidden className="text-[#fca5a5]" /> : <Volume2 size={17} aria-hidden />}
        onClick={toggleMute}
        pressed={muted}
        tip={tip}
        className={WOOD_BTN}
      />
      <IconButton label="Jeda (Esc)" icon={<Pause size={17} aria-hidden />} onClick={pause} tip={tip} className={WOOD_BTN} />
    </>
  );

  if (variant === 'floating') {
    return (
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-full px-2 py-1"
        style={{
          background: '#2b2118',
          border: '2.5px solid #f5deb3',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45), 0 3px 0 #1a110b',
        }}
      >
        <RoundPill mini />
        <div className="flex items-center gap-1 [&_button]:!h-8 [&_button]:!w-8 [&_button]:!min-w-8 [&_button]:!rounded-full">
          {buttons}
        </div>
      </div>
    );
  }

  if (variant === 'stack') {
    return (
      <div className="flex flex-col gap-1.5">
        <RoundPill compact />
        <div className="grid grid-cols-2 gap-1.5 [&>span>button]:!w-full [&>span]:w-full">{buttons}</div>
      </div>
    );
  }

  return (
    <header
      className="flex items-center gap-2 rounded-2xl px-2 py-1"
      style={{
        background: '#2b2118',
        border: '2.5px solid #f5deb3',
        boxShadow: '0 5px 14px rgba(0, 0, 0, 0.4), 0 2px 0 #1a110b',
      }}
    >
      {wide && (
        <div className="hidden max-h-12 shrink-0 items-center lg:flex">
          <Logo size="sm" />
        </div>
      )}
      <RoundPill compact={!wide} />
      <div
        className={clsx(
          'ml-auto flex shrink-0 items-center [&_button]:!h-9 [&_button]:!w-9 [&_button]:!min-w-9 [&_button]:!rounded-xl',
          wide ? 'gap-2' : 'gap-1',
        )}
      >
        {buttons}
      </div>
    </header>
  );
}
