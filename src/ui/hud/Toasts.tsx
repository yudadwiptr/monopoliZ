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
            className="flex max-w-md items-start gap-2.5 rounded-2xl border-[2.5px] border-[#2b1d12] bg-[#fee2e2] px-4 py-2.5 text-[#7f1d1d] shadow-[0_5px_0_#2b1d12,0_12px_28px_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24, x: { duration: 0.4 } }}
          >
            <CircleAlert size={20} className="mt-0.5 shrink-0 text-[#b91c1c]" aria-hidden />
            <div className="min-w-0">
              <div className="font-display text-base font-black text-[#991b1b]">Waduh, nggak bisa!</div>
              <div className="break-words text-sm font-bold text-[#7f1d1d]">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TONE_STYLE = {
  good: 'border-[#15803d] bg-[#dcfce7] text-[#14532d]',
  bad: 'border-[#b91c1c] bg-[#fee2e2] text-[#7f1d1d]',
  info: 'border-[#2b1d12] bg-[#f5e6c8] text-[#2b1d12]',
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
              'max-w-sm rounded-2xl border-[2.5px] px-4 py-2 text-center font-display text-base font-black shadow-[0_4px_0_#2b1d12,0_10px_24px_rgba(0,0,0,0.45)]',
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
