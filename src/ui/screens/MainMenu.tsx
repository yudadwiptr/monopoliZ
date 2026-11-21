import { motion, type Variants } from 'framer-motion';
import { BookOpen, Play, RotateCcw, Settings, Zap } from 'lucide-react';
import { useState } from 'react';
import { useGame } from '@/store/gameStore';
import { Button, Logo } from '@/ui/common';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { quickPlayConfig } from './parts/setup/setupModel';
import { SettingsModal } from './SettingsModal';

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 24 } },
};

/** Diagonal light sweep across a button. */
function Shine({ delay = 1.2 }: { delay?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span
        className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        style={{ animation: `mz-shine 3.8s ease-in-out ${delay}s infinite both` }}
      />
    </span>
  );
}

function TwoLine({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="flex flex-col items-start leading-tight">
      <span>{title}</span>
      <span className="font-sans text-xs font-semibold opacity-75">{sub}</span>
    </span>
  );
}

function Hero() {
  return (
    <motion.div
      className="relative flex flex-col items-center text-center [@media(max-height:520px)]:flex-1"
      initial={{ opacity: 0, y: -40, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
    >
      {/* rotating light rays + brand glow behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(130vw,560px)] w-[min(130vw,560px)] -translate-x-1/2 -translate-y-1/2 [@media(max-height:520px)]:h-[340px] [@media(max-height:520px)]:w-[340px]"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'repeating-conic-gradient(from 0deg, rgba(140,196,245,0.09) 0deg 7deg, transparent 7deg 20deg)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 20%, transparent 78%)',
            maskImage: 'radial-gradient(closest-side, #000 20%, transparent 78%)',
            animation: 'mz-rays 70s linear infinite',
          }}
        />
        <div
          className="absolute inset-[22%] rounded-full"
          style={{
            background: 'radial-gradient(closest-side, rgba(58,140,214,0.55), rgba(58,140,214,0.15) 55%, transparent 75%)',
            animation: 'mz-breathe 4.5s ease-in-out infinite',
          }}
        />
      </div>

      <h1 aria-label="MonopoliZ" className="relative flex max-w-[92vw] justify-center">
        <Logo size="xl" animated />
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 24 }}
        className="relative mt-4 flex flex-col items-center gap-2"
      >
        <span className="rounded-full border border-gold-300/30 bg-gold-500/15 px-3 py-1 font-display text-sm font-semibold tracking-wide text-gold-300">
          ✨ Monopoli Nusantara zaman now
        </span>
        <p className="max-w-xs text-sm text-ink-200 sm:text-base">
          Beli kota, bangun landmark, akuisisi punya lawan — jadi sultan se-Nusantara!
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Title screen. */
export function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const startGame = useGame((s) => s.startGame);
  const continueGame = useGame((s) => s.continueGame);
  const [canContinue, setCanContinue] = useState(() => useGame.getState().hasSave());
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop />

      <div className="relative z-10 flex h-full flex-col overflow-y-auto overflow-x-hidden px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] scrollbar-thin">
        <main className="mx-auto my-auto flex w-full max-w-md flex-col items-center gap-8 py-4 [@media(max-height:520px)]:max-w-4xl [@media(max-height:520px)]:flex-row [@media(max-height:520px)]:gap-10">
          <Hero />

          <motion.nav
            aria-label="Menu utama"
            variants={list}
            initial="hidden"
            animate="show"
            className="flex w-full max-w-sm flex-col gap-3 [@media(max-height:520px)]:w-80"
          >
            <motion.div variants={item}>
              <Button
                variant="primary"
                size="xl"
                block
                icon={<Play size={26} fill="currentColor" aria-hidden />}
                onClick={() => setScreen('setup')}
              >
                Main Sekarang
                <Shine />
              </Button>
            </motion.div>

            <motion.div variants={item}>
              <Button
                variant="gold"
                size="lg"
                block
                icon={<Zap size={22} fill="currentColor" aria-hidden />}
                onClick={() => startGame(quickPlayConfig())}
                aria-label="Main Cepat vs Bot: kamu lawan 3 bot di peta Nusantara"
              >
                <TwoLine title="Main Cepat vs Bot" sub="Kamu vs 3 bot • Peta Nusantara" />
                <Shine delay={2.6} />
              </Button>
            </motion.div>

            {canContinue && (
              <motion.div variants={item}>
                <Button
                  variant="glass"
                  size="lg"
                  block
                  icon={<RotateCcw size={20} aria-hidden />}
                  onClick={() => {
                    if (!continueGame()) setCanContinue(false);
                  }}
                >
                  <TwoLine title="Lanjutkan" sub="Balik ke game terakhirmu" />
                </Button>
              </motion.div>
            )}

            <motion.div variants={item} className="grid grid-cols-2 gap-3">
              <Button variant="glass" size="md" block icon={<BookOpen size={18} aria-hidden />} onClick={() => setScreen('howto')}>
                Cara Main
              </Button>
              <Button variant="glass" size="md" block icon={<Settings size={18} aria-hidden />} onClick={() => setSettingsOpen(true)}>
                Pengaturan
              </Button>
            </motion.div>
          </motion.nav>
        </main>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-3 shrink-0 text-center text-xs text-ink-300"
        >
          build by{' '}
          <a
            href="https://yumastudio.digital/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink-100 underline-offset-2 transition-colors hover:text-brand-300 hover:underline"
          >
            yumastudio.digital
          </a>
        </motion.footer>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
