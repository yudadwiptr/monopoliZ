import { motion, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { BookOpen, Globe, Play, RotateCcw, Settings, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useGame } from '@/store/gameStore';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { quickPlayConfig } from './parts/setup/setupModel';
import { SettingsModal } from './SettingsModal';

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 24 } },
};

function TwoLine({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="flex min-w-0 flex-col items-start text-left leading-tight">
      <span className="truncate font-display text-sm font-extrabold tracking-wide sm:text-base">{title}</span>
      <span className="truncate font-sans text-[11px] font-semibold opacity-85 sm:text-xs">{sub}</span>
    </span>
  );
}

interface MenuButton2DProps {
  tone: 'primary' | 'gold' | 'cream' | 'wood';
  size?: 'xl' | 'lg' | 'md';
  icon?: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<MenuButton2DProps['tone'], string> = {
  primary:
    'bg-gradient-to-b from-[#49b6ff] via-[#2b8fe0] to-[#1e74c2] text-white [text-shadow:0_1.5px_0_#133a63]',
  gold:
    'bg-gradient-to-b from-[#ffe074] via-[#ffc52e] to-[#f0a211] text-[#2d1e12] [text-shadow:0_1px_0_rgba(255,255,255,0.45)]',
  cream:
    'bg-gradient-to-b from-[#fbf5e3] via-[#f1e4c3] to-[#e2cfa2] text-[#2d1e12] [text-shadow:0_1px_0_rgba(255,255,255,0.6)]',
  wood:
    'bg-gradient-to-b from-[#334155]/92 to-[#1e293b]/95 text-white backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]',
};

const SIZE_CLASS: Record<NonNullable<MenuButton2DProps['size']>, string> = {
  xl: 'min-h-[52px] px-5 py-2.5 text-lg sm:min-h-[56px] sm:text-xl',
  lg: 'min-h-[46px] px-4 py-2 text-sm sm:min-h-[50px] sm:text-base',
  md: 'min-h-[40px] px-3 py-1.5 text-xs sm:min-h-[42px] sm:text-sm',
};

/**
 * 2D Comic-styled button matching the Meow Gambit Nusantara lobby illustration:
 * - 2px solid #2d1e12 border
 * - 14px border-radius
 * - 0 4px 0 #2d1e12 solid bottom shadow
 */
function MenuButton2D({ tone, size = 'lg', icon, onClick, ariaLabel, children }: MenuButton2DProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={{ y: -1.5 }}
      whileTap={{ y: 2 }}
      className={clsx(
        'group relative flex w-full select-none items-center justify-center gap-2.5 overflow-hidden font-display font-extrabold outline-none transition-transform',
        'rounded-[14px] border-2 border-[#2d1e12] shadow-[0_4px_0_#2d1e12,0_8px_18px_rgba(0,0,0,0.32)]',
        'active:shadow-[0_2px_0_#2d1e12]',
        'focus-visible:ring-4 focus-visible:ring-gold-300/70',
        TONE_CLASS[tone],
        SIZE_CLASS[size],
      )}
    >
      {/* Top glossy cartoon highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1.5 top-0.5 h-[35%] rounded-t-[10px] bg-gradient-to-b from-white/35 to-transparent"
      />
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </motion.button>
  );
}

/** Title screen using the 2D illustrated `/lobby/lobby_bg_2d.webp` background. */
export function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const startGame = useGame((s) => s.startGame);
  const continueGame = useGame((s) => s.continueGame);
  const [canContinue, setCanContinue] = useState(() => useGame.getState().hasSave());
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden">
      <MenuBackdrop variant="full" />

      {/* Accessible headings corresponding to the illustrated logo & ribbon baked into lobby_bg_2d.png */}
      <h1 className="sr-only">MonopoliZ — Monopoli Nusantara zaman now</h1>

      <div className="relative z-10 flex h-full min-h-[100dvh] flex-col items-center justify-between overflow-y-auto overflow-x-hidden px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] scrollbar-thin">
        {/*
          Top reserved space (28dvh on mobile portrait, 36dvh on desktop) so the illustrated MONOPOLIZ logo
          and "✨ Monopoli Nusantara zaman now" ribbon on lobby_bg_2d.png remain 100% unobstructed.
        */}
        <div className="flex w-full shrink-0 flex-col items-center pt-[28dvh] sm:pt-[36dvh]" />

        {/* Center meadow menu buttons (width: min(88vw, 360px), gap: 10px, min-h: 46px) */}
        <motion.nav
          aria-label="Menu utama"
          variants={list}
          initial="hidden"
          animate="show"
          className="my-auto flex w-[min(88vw,360px)] flex-col gap-2.5 py-2 sm:w-full sm:max-w-[23rem]"
        >
          <motion.div variants={item}>
            <MenuButton2D
              tone="primary"
              size="xl"
              icon={<Play size={22} fill="currentColor" aria-hidden />}
              onClick={() => setScreen('setup')}
            >
              Main Sekarang
            </MenuButton2D>
          </motion.div>

          <motion.div variants={item}>
            <MenuButton2D
              tone="gold"
              size="lg"
              icon={<Globe size={20} aria-hidden />}
              onClick={() => setScreen('online')}
            >
              <TwoLine title="Mabar Online (Kode Room)" sub="Main bareng teman beda HP • Real-time" />
            </MenuButton2D>
          </motion.div>

          <motion.div variants={item}>
            <MenuButton2D
              tone="cream"
              size="lg"
              icon={<Zap size={20} fill="currentColor" className="text-[#d97706]" aria-hidden />}
              onClick={() => startGame(quickPlayConfig())}
              ariaLabel="Main Cepat vs Bot: kamu lawan 3 bot di peta Nusantara"
            >
              <TwoLine title="Main Cepat vs Bot" sub="Kamu vs 3 bot • Peta Nusantara" />
            </MenuButton2D>
          </motion.div>

          {canContinue && (
            <motion.div variants={item}>
              <MenuButton2D
                tone="cream"
                size="lg"
                icon={<RotateCcw size={19} aria-hidden />}
                onClick={() => {
                  if (!continueGame()) setCanContinue(false);
                }}
              >
                <TwoLine title="Lanjutkan" sub="Balik ke game terakhirmu" />
              </MenuButton2D>
            </motion.div>
          )}

          <motion.div variants={item} className="grid grid-cols-2 gap-2.5">
            <MenuButton2D
              tone="wood"
              size="md"
              icon={<BookOpen size={16} aria-hidden />}
              onClick={() => setScreen('howto')}
            >
              Cara Main
            </MenuButton2D>
            <MenuButton2D
              tone="wood"
              size="md"
              icon={<Settings size={16} aria-hidden />}
              onClick={() => setSettingsOpen(true)}
            >
              Pengaturan
            </MenuButton2D>
          </motion.div>
        </motion.nav>

        {/* Footer Credit sitting cleanly at the bottom between the left & right character groups */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-1 shrink-0 text-center"
        >
          <span
            className="inline-block rounded-full border border-white/15 px-3.5 py-1 text-xs font-medium text-ink-100"
            style={{
              background: 'rgba(15, 23, 42, 0.58)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            }}
          >
            build by{' '}
            <a
              href="https://yumastudio.digital/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gold-300 underline-offset-2 transition-colors hover:text-gold-200 hover:underline"
            >
              yumastudio.digital
            </a>
          </span>
        </motion.footer>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
