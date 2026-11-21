import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { canLockLandscape, enterLandscape, isPhone, isPortrait } from '@/lib/orientation';
import { Button } from '@/ui/common';

function usePhonePortrait(): boolean {
  const [on, setOn] = useState(() => isPhone() && isPortrait());
  useEffect(() => {
    const update = () => setOn(isPhone() && isPortrait());
    const late = () => requestAnimationFrame(update);
    window.addEventListener('resize', late);
    window.addEventListener('orientationchange', late);
    return () => {
      window.removeEventListener('resize', late);
      window.removeEventListener('orientationchange', late);
    };
  }, []);
  return on;
}

/**
 * Phones play MonopoliZ in landscape, like a mobile board game. Held upright, the game pauses behind a
 * "putar HP" screen and resumes by itself once the phone is turned.
 */
export function RotateGate() {
  const blocked = usePhonePortrait();
  const pausedByUs = useRef(false);

  useEffect(() => {
    const store = useGame.getState();
    if (blocked) {
      if (!store.paused) {
        pausedByUs.current = true;
        store.setPaused(true);
      }
    } else if (pausedByUs.current) {
      pausedByUs.current = false;
      store.setPaused(false);
    }
  }, [blocked]);

  return (
    <AnimatePresence>
      {blocked && (
        <motion.div
          className="batik-bg fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-ink-950/95 px-8 text-center backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-label="Putar HP ke posisi landscape"
        >
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 shadow-glow-brand"
            aria-hidden
          >
            <motion.span
              className="flex"
              animate={{ rotate: [0, 0, -90, -90, 0] }}
              transition={{ duration: 2.4, times: [0, 0.2, 0.5, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
            >
              <Smartphone size={56} strokeWidth={1.8} />
            </motion.span>
          </motion.div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-white">Putar HP-mu 🔄</h2>
            <p className="mx-auto max-w-xs text-sm text-ink-200">
              MonopoliZ dimainkan menyamping biar papannya gede dan jelas. Game dijeda dulu, lanjut otomatis begitu
              HP diputar.
            </p>
          </div>
          {canLockLandscape() && (
            <Button variant="primary" size="md" icon={<Maximize2 size={18} aria-hidden />} onClick={() => void enterLandscape()}>
              Layar penuh & landscape
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
