import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Box, Diamond, Gauge, Grid2x2, Pause, Rabbit, Turtle, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '@/store/gameStore';
import { CAMERA_LABEL, SPEED_LABEL, useSettings, type CameraMode, type GameSpeed } from '@/store/settingsStore';
import { Logo } from '@/ui/common';
import { IconButton } from './IconButton';
import { useMapDef } from './hooks';

export type TopBarVariant = 'wide' | 'compact' | 'stack' | 'mini';

const SPEED_ORDER: GameSpeed[] = ['santai', 'normal', 'ngebut'];
const SPEED_ICON: Record<GameSpeed, React.ReactNode> = {
  santai: <Turtle size={20} aria-hidden />,
  normal: <Gauge size={20} aria-hidden />,
  ngebut: <Rabbit size={20} aria-hidden />,
};

const CAMERA_ORDER: CameraMode[] = ['iso', '3d', 'top'];
const CAMERA_ICON: Record<CameraMode, React.ReactNode> = {
  iso: <Diamond size={20} aria-hidden />,
  '3d': <Box size={20} aria-hidden />,
  top: <Grid2x2 size={20} aria-hidden />,
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

function RoundPill({ compact }: { compact?: boolean }) {
  const round = useGame((s) => s.game?.round ?? 1);
  const maxRounds = useGame((s) => s.game?.config.maxRounds ?? null);
  const map = useMapDef();
  const final = maxRounds !== null && round >= maxRounds - 1;
  const progress = maxRounds ? Math.min(1, round / maxRounds) : 0;

  return (
    <div
      className={clsx(
        'glass relative flex min-w-0 items-center gap-2 overflow-hidden !rounded-2xl',
        // pb leaves room for the progress line along the bottom edge
        compact ? 'h-11 px-2.5 pb-1' : 'h-12 px-3 pb-1',
      )}
      aria-label={`Ronde ${round}${maxRounds ? ` dari ${maxRounds}` : ''}, peta ${map?.name ?? ''}`}
    >
      {map && (
        <span className={clsx('shrink-0 leading-none', compact ? 'text-lg' : 'text-2xl')} aria-hidden>
          {map.theme.emblem}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <div className="flex items-baseline gap-1 whitespace-nowrap font-display font-semibold">
          <span className={clsx('text-ink-300', compact ? 'text-xs' : 'text-sm')}>Ronde</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={round}
              className={clsx('num inline-block', compact ? 'text-base' : 'text-lg', final ? 'text-merah-300' : 'text-white')}
              initial={{ scale: 1.8, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {round}
            </motion.span>
          </AnimatePresence>
          {maxRounds !== null && <span className={clsx('num text-ink-300', compact ? 'text-xs' : 'text-sm')}>/{maxRounds}</span>}
        </div>
        <div className="truncate text-[11px] font-medium text-ink-300">
          {final ? <span className="font-semibold text-merah-300">Ronde terakhir, gas pol!</span> : map?.name}
        </div>
      </div>
      {maxRounds !== null && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10" aria-hidden>
          <motion.div
            className={clsx('h-full w-full origin-left rounded-full', final ? 'bg-merah-400' : 'bg-brand-400')}
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

export function TopBar({ variant }: { variant: TopBarVariant }) {
  const speed = useSettings((s) => s.speed);
  const camera = useSettings((s) => s.camera);
  const muted = useSettings((s) => s.sfxVolume === 0 && s.musicVolume === 0);

  const cycleSpeed = () => {
    const i = SPEED_ORDER.indexOf(speed);
    useSettings.getState().setSpeed(SPEED_ORDER[(i + 1) % SPEED_ORDER.length]);
  };
  const toggleCamera = () => {
    const i = CAMERA_ORDER.indexOf(camera);
    useSettings.getState().setCamera(CAMERA_ORDER[(i + 1) % CAMERA_ORDER.length]);
  };
  const pause = () => useGame.getState().setPaused(true);

  const wide = variant === 'wide';
  const tip = variant !== 'stack';
  const cameraName = CAMERA_LABEL[camera] ?? '3D';

  const buttons = (
    <>
      <IconButton
        label={`Kecepatan: ${SPEED_LABEL[speed]} (ketuk untuk ganti)`}
        icon={SPEED_ICON[speed]}
        text={wide ? SPEED_LABEL[speed] : undefined}
        onClick={cycleSpeed}
        tip={tip}
      />
      <IconButton
        label={`Kamera: ${cameraName} (ketuk untuk ganti)`}
        icon={CAMERA_ICON[camera] ?? CAMERA_ICON['3d']}
        text={wide ? cameraName : undefined}
        onClick={toggleCamera}
        tip={tip}
      />
      <IconButton
        label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
        icon={muted ? <VolumeX size={20} aria-hidden className="text-merah-300" /> : <Volume2 size={20} aria-hidden />}
        onClick={toggleMute}
        pressed={muted}
        tip={tip}
      />
      <IconButton label="Jeda (Esc)" icon={<Pause size={20} aria-hidden />} onClick={pause} tip={tip} />
    </>
  );

  if (variant === 'mini') {
    // Short landscape screens: just the round and one menu button (speed, camera and sound live in Jeda → Pengaturan).
    return (
      <header className="flex items-center gap-1.5">
        <RoundPill compact />
        <div className="ml-auto">
          <IconButton label="Menu & pengaturan (Esc)" icon={<Pause size={18} aria-hidden />} onClick={pause} tip={false} />
        </div>
      </header>
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
    <header className="flex items-center gap-2">
      {wide && (
        <div className="hidden max-h-12 shrink-0 items-center lg:flex">
          <Logo size="sm" />
        </div>
      )}
      <RoundPill compact={!wide} />
      <div className={clsx('ml-auto flex shrink-0 items-center', wide ? 'gap-2' : 'gap-1.5')}>{buttons}</div>
    </header>
  );
}
