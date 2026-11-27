import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sfx } from '@/audio';
import { useGame } from '@/store/gameStore';
import { HowToPlay } from './HowToPlay';
import { SettingsModal } from './SettingsModal';

type Sub = 'main' | 'confirm' | 'settings' | 'howto';

/**
 * 2D Hand-Drawn Pause Menu Modal (`/ui/card_pause_jeda.webp`):
 * - Uses `/ui/card_pause_jeda.webp` (`width: min(90vw, 360px)`, `aspect-ratio: 3 / 4`, `background-size: 100% 100%`) as the entire modal frame.
 * - Does not render a duplicate pause icon since the glowing blue `||` icon is part of the artwork.
 * - Positions "Jeda" inside the scroll banner (`top: 31.5%`), the round description below it (`top: 41.8%`),
 *   and transparent interactive buttons directly over the 4 drawn button boxes ("Lanjutkan", "Pengaturan", "Cara Main", "Keluar ke Menu").
 */
export function PauseMenu() {
  const paused = useGame((s) => s.paused);
  const round = useGame((s) => s.game?.round ?? 1);
  const maxRounds = useGame((s) => s.game?.config.maxRounds ?? null);
  const setPaused = useGame((s) => s.setPaused);
  const quitToMenu = useGame((s) => s.quitToMenu);
  const [sub, setSub] = useState<Sub>('main');

  useEffect(() => {
    if (!paused) setSub('main');
  }, [paused]);

  const resume = () => {
    sfx.play('click');
    setPaused(false);
  };
  const subtitle = `Ronde ${round}${maxRounds ? ` dari ${maxRounds}` : ''} • Napas dulu, sultan ☕`;
  const cardOpen = paused && (sub === 'main' || sub === 'confirm');
  const isConfirm = sub === 'confirm';

  return (
    <>
      <AnimatePresence>
        {cardOpen && (
          <div
            key="pause-card-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            {/* Soft dark backdrop behind the 2D pause card */}
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={isConfirm ? () => setSub('main') : resume}
            />

            {/* Main 2D Hand-Drawn Pause Card Container */}
            <motion.div
              key="pause-card"
              className="relative select-none"
              style={{
                width: 'min(90vw, 360px)',
                aspectRatio: '3 / 4',
                backgroundImage: "url('/ui/card_pause_jeda.webp')",
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10% 8% 12% 8%',
                filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.6))',
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {/* Title inside the scroll banner below the pause icon */}
              <h2
                id="pause-title"
                className="font-display"
                style={{
                  position: 'absolute',
                  top: '31.4%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 'clamp(19px, 5.5vw, 23px)',
                  fontWeight: 800,
                  color: '#1e130c',
                  lineHeight: 1.1,
                }}
              >
                {isConfirm ? 'Keluar?' : 'Jeda'}
              </h2>

              {/* Description below the scroll banner */}
              <p
                className="font-display"
                style={{
                  position: 'absolute',
                  top: '41.8%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  fontWeight: 600,
                  color: '#5c4028',
                  width: '80%',
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}
              >
                {isConfirm ? 'Progres otomatis tersimpan di menu Lanjutkan 💾' : subtitle}
              </p>

              {/* 1. Primary Blue Bar Button ("Lanjutkan" / "Batal, Lanjut Main") */}
              <button
                type="button"
                onClick={isConfirm ? () => (sfx.play('click'), setSub('main')) : resume}
                autoFocus
                className="font-display transition-transform active:scale-[0.98]"
                style={{
                  position: 'absolute',
                  top: '50.2%',
                  left: '12%',
                  width: '76%',
                  height: '11.5%',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 'clamp(14px, 3.8vw, 17px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  textShadow: '0 1.5px 2px rgba(0, 0, 0, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: '10%',
                }}
              >
                {isConfirm ? 'Batal (Lanjut Main)' : 'Lanjutkan'}
              </button>

              {/* 2. Two Side-by-Side Brown Buttons ("Pengaturan" & "Cara Main") */}
              <div
                style={{
                  position: 'absolute',
                  top: '64.8%',
                  left: '12%',
                  width: '76%',
                  height: '10.5%',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '3.5%',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    sfx.play('click');
                    setSub('settings');
                  }}
                  className="font-display transition-transform active:scale-[0.97]"
                  style={{
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    textAlign: 'center',
                    textShadow: '0 1.5px 2px rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: '20%',
                  }}
                >
                  Pengaturan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sfx.play('click');
                    setSub('howto');
                  }}
                  className="font-display transition-transform active:scale-[0.97]"
                  style={{
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    textAlign: 'center',
                    textShadow: '0 1.5px 2px rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: '20%',
                  }}
                >
                  Cara Main
                </button>
              </div>

              {/* 3. Bottom Thin Bar Button ("Keluar ke Menu") */}
              <button
                type="button"
                onClick={() => {
                  sfx.play('click');
                  if (isConfirm) quitToMenu();
                  else setSub('confirm');
                }}
                className="font-display transition-transform active:scale-[0.98]"
                style={{
                  position: 'absolute',
                  top: '79.3%',
                  left: '13%',
                  width: '74%',
                  height: '6.6%',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 'clamp(11px, 2.8vw, 13px)',
                  fontWeight: 800,
                  color: isConfirm ? '#b91c1c' : '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: '10%',
                }}
              >
                {isConfirm ? 'Ya, Keluar ke Menu!' : 'Keluar ke Menu'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal open={paused && sub === 'settings'} onClose={() => setSub('main')} />

      <AnimatePresence>
        {paused && sub === 'howto' && (
          <motion.div
            key="howto"
            className="fixed inset-0 z-50 bg-ink-900"
            role="dialog"
            aria-modal="true"
            aria-label="Cara main"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <HowToPlay onClose={() => setSub('main')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
