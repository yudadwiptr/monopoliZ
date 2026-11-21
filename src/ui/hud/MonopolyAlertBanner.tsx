import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { WIN_REASON_LABEL } from '@/engine/selectors';
import { useGame } from '@/store/gameStore';
import { Avatar } from '@/ui/common';
import { useHumanCount, useMapDef } from './hooks';

/** Urgent "AWAS! X tinggal 1 petak lagi menuju Monopoli …" banner while `alert` is set. */
export function MonopolyAlertBanner() {
  const alert = useGame((s) => s.alert);
  const player = useGame((s) => (s.alert ? s.game?.players.find((p) => p.id === s.alert?.playerId) : undefined));
  const humans = useHumanCount();
  const map = useMapDef();

  const self = !!player && !player.isBot && humans === 1;
  const missing = alert && map ? alert.missing.map((i) => map.tiles[i]).filter(Boolean) : [];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}
    >
      <AnimatePresence>
        {alert && player && (
          <motion.div
            key={`${alert.playerId}-${alert.reason}-${alert.missing.join('.')}`}
            role="alert"
            className={clsx(
              'relative w-full max-w-xl overflow-hidden rounded-3xl border-2 p-[2px] shadow-glass',
              self ? 'border-gold-300/80 shadow-glow-gold' : 'border-merah-400/80 shadow-glow-merah',
            )}
            initial={{ y: -80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: [0, -1.2, 1.2, -0.8, 0.8, 0] }}
            exit={{ y: -60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, rotate: { duration: 0.6, delay: 0.15 } }}
          >
            <motion.div
              aria-hidden
              className={clsx(
                'absolute inset-0',
                self
                  ? 'bg-[linear-gradient(110deg,#A86F00,#FFC21F_45%,#FFE08A_55%,#A86F00)]'
                  : 'bg-[linear-gradient(110deg,#A3102F,#FF3B5C_45%,#FFC21F_55%,#A3102F)]',
              )}
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <div className="relative rounded-[1.35rem] bg-ink-950/85 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <motion.span
                  className="shrink-0 text-3xl leading-none"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  aria-hidden
                >
                  {self ? '🔥' : '⚠️'}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      'font-display text-lg font-bold uppercase leading-tight tracking-wider',
                      self ? 'text-gold-300' : 'text-merah-300',
                    )}
                  >
                    {self ? 'Dikit lagi!' : 'Awas!'}
                  </div>
                  <p className="text-sm leading-snug text-ink-100">
                    {self ? (
                      'Kamu'
                    ) : (
                      <span className="font-semibold" style={{ color: player.color }}>
                        {player.name}
                      </span>
                    )}{' '}
                    tinggal 1 petak lagi menuju{' '}
                    <span className={clsx('font-bold', self ? 'text-gold-300' : 'text-gold-400')}>{WIN_REASON_LABEL[alert.reason]}</span>!
                    {!self && ' Halangi sekarang!'}
                  </p>
                </div>
                <Avatar characterId={player.characterId} size={40} className="hidden sm:block" />
              </div>
              {missing.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                    {missing.length > 1 ? 'Salah satu dari:' : 'Petak penentu:'}
                  </span>
                  {missing.slice(0, 6).map((t) => (
                    <span
                      key={t.index}
                      className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white"
                    >
                      <span aria-hidden>{t.icon}</span>
                      {t.name}
                    </span>
                  ))}
                  {missing.length > 6 && <span className="text-xs text-ink-300">+{missing.length - 6} lagi</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
