import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { canFullscreen, enterFullscreen, isFullscreen, isIOS, isPhone, isPortrait, isStandalone } from '@/lib/orientation';

const NEVER_KEY = 'monopoliz.hint.display.never';

type Hint = 'ios-home' | 'android-full' | 'rotate' | null;

function pickHint(): Hint {
  if (!isPhone() || isStandalone()) return null;
  if (isIOS()) return 'ios-home';
  if (canFullscreen() && !isFullscreen()) return 'android-full';
  if (isPortrait()) return 'rotate';
  return null;
}

function readNever(): boolean {
  try {
    return localStorage.getItem(NEVER_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * A small, dismissible tip for playing comfortably on a phone — never blocks the game.
 * iPhone: add to home screen for real fullscreen. Android: one-tap fullscreen. Otherwise: try landscape.
 */
export function PlayHint() {
  const [hint, setHint] = useState<Hint>(null);

  useEffect(() => {
    if (readNever()) return;
    const t = setTimeout(() => setHint(pickHint()), 1200);
    // Auto-hide after a while so it never lingers over the board.
    const hide = setTimeout(() => setHint(null), 14000);
    return () => {
      clearTimeout(t);
      clearTimeout(hide);
    };
  }, []);

  const close = (never = false) => {
    setHint(null);
    if (never) {
      try {
        localStorage.setItem(NEVER_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[45] flex justify-center px-3"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          role="status"
        >
          <div className="glass-strong pointer-events-auto flex max-w-sm items-start gap-3 !rounded-2xl p-3 pr-2 text-left">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-200">
              {hint === 'ios-home' ? <Share size={18} /> : hint === 'android-full' ? <Maximize2 size={18} /> : <Smartphone size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              {hint === 'ios-home' && (
                <>
                  <p className="font-display text-sm font-semibold text-white">Main layar penuh di iPhone</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-200">
                    Ketuk <b className="text-white">Bagikan</b> lalu <b className="text-white">Tambahkan ke Layar Utama</b>. Buka dari
                    ikonnya — bar Safari hilang, papan jadi lega.
                  </p>
                </>
              )}
              {hint === 'android-full' && (
                <>
                  <p className="font-display text-sm font-semibold text-white">Biar papan lebih lega</p>
                  <button
                    type="button"
                    onClick={() => {
                      void enterFullscreen();
                      close();
                    }}
                    className="mt-1.5 rounded-full bg-brand-500 px-3 py-1 font-display text-xs font-semibold text-white"
                  >
                    Layar penuh
                  </button>
                </>
              )}
              {hint === 'rotate' && (
                <>
                  <p className="font-display text-sm font-semibold text-white">Bisa main tegak atau miring</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-200">Putar HP kalau mau papan lebih lebar.</p>
                </>
              )}
              <button type="button" onClick={() => close(true)} className="mt-1.5 text-[11px] font-medium text-ink-300 underline-offset-2 hover:underline">
                Jangan tampilkan lagi
              </button>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => close()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
