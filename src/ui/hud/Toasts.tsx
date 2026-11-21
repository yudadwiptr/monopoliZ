import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { CircleAlert } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useGame } from '@/store/gameStore';

const ERROR_MS = 2500;

/** Shows `useGame().error` briefly, then clears it. */
export function ErrorToast() {
  const error = useGame((s) => s.error);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => useGame.getState().clearError(), ERROR_MS);
    return () => window.clearTimeout(t);
  }, [error]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
    >
      <AnimatePresence>
        {error && (
          <motion.div
            key={error}
            role="alert"
            className="flex max-w-md items-start gap-2.5 rounded-2xl border border-merah-400/60 bg-ink-950/90 px-4 py-2.5 shadow-glow-merah backdrop-blur-md"
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24, x: { duration: 0.4 } }}
          >
            <CircleAlert size={20} className="mt-0.5 shrink-0 text-merah-400" aria-hidden />
            <div className="min-w-0">
              <div className="font-display text-base font-semibold text-merah-300">Waduh, nggak bisa!</div>
              <div className="break-words text-sm text-ink-200">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TONE_STYLE = {
  good: 'border-daun-500/50 text-daun-400',
  bad: 'border-merah-500/55 text-merah-300',
  info: 'border-white/20 text-ink-100',
} as const;

/** Toasts for fx items with neither a tile nor a player anchor (e.g. engine `message` events). */
export function CenterToasts() {
  const fx = useGame((s) => s.fx);
  const toasts = useMemo(
    () => fx.filter((f) => f.kind === 'text' && f.tile === undefined && f.playerId === undefined && f.text).slice(-3),
    [fx],
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[24%] z-30 flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={clsx(
              'max-w-sm rounded-2xl border bg-ink-950/85 px-4 py-2 text-center font-display text-base font-semibold shadow-glass backdrop-blur-md',
              TONE_STYLE[t.tone],
            )}
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 460, damping: 26 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
