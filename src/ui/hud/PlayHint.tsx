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
          <div
            className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border-[3px] border-[#2b1d12] p-3 pr-2 text-left text-[#2b1d12]"
            style={{
              background: 'linear-gradient(180deg, #fff9ea 0%, #f5e6c8 60%, #ebd4a9 100%)',
              boxShadow: '0 5px 0 #2b1d12, 0 14px 32px rgba(0,0,0,0.55)',
            }}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#2b1d12] bg-[#fef3c7] text-[#b45309]">
              {hint === 'ios-home' ? <Share size={18} /> : hint === 'android-full' ? <Maximize2 size={18} /> : <Smartphone size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              {hint === 'ios-home' && (
                <>
                  <p className="font-display text-sm font-black text-[#2b1d12]">Main layar penuh di iPhone</p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-[#4a3525]">
                    Ketuk <b className="font-black text-[#2b1d12]">Bagikan</b> lalu <b className="font-black text-[#2b1d12]">Tambahkan ke Layar Utama</b>. Buka dari
                    ikonnya — bar Safari hilang, papan jadi lega.
                  </p>
                </>
              )}
              {hint === 'android-full' && (
                <>
                  <p className="font-display text-sm font-black text-[#2b1d12]">Biar papan lebih lega</p>
                  <button
                    type="button"
                    onClick={() => {
                      void enterFullscreen();
                      close();
                    }}
                    className="mt-1.5 rounded-full border-2 border-[#2b1d12] bg-[#f59e0b] px-3 py-1 font-display text-xs font-black text-[#2b1d12] shadow-[0_2px_0_#2b1d12]"
                  >
                    Layar penuh
                  </button>
                </>
              )}
              {hint === 'rotate' && (
                <>
                  <p className="font-display text-sm font-black text-[#2b1d12]">Bisa main tegak atau miring</p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-[#4a3525]">Putar HP kalau mau papan lebih lebar.</p>
                </>
              )}
              <button type="button" onClick={() => close(true)} className="mt-1.5 text-[11px] font-bold text-[#6e5239] underline-offset-2 hover:underline">
                Jangan tampilkan lagi
              </button>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => close()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5c4028] hover:bg-[#ebd4a9] hover:text-[#2b1d12]"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
