import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, LogOut, Pause, Play, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { Button, Modal } from '@/ui/common';
import { HowToPlay } from './HowToPlay';
import { SettingsModal } from './SettingsModal';

type Sub = 'main' | 'confirm' | 'settings' | 'howto';

function PauseMain({
  subtitle,
  onResume,
  onSettings,
  onHowTo,
  onQuit,
}: {
  subtitle: string;
  onResume(): void;
  onSettings(): void;
  onHowTo(): void;
  onQuit(): void;
}) {
  return (
    <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="mb-6 flex flex-col items-center text-center">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}
          className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-btn-brand"
        >
          <Pause size={30} fill="currentColor" aria-hidden />
        </motion.span>
        <h2 id="pause-title" className="mt-3 font-display text-4xl font-bold text-white">
          Jeda
        </h2>
        <p className="mt-1 text-sm text-ink-300">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" block icon={<Play size={22} fill="currentColor" aria-hidden />} onClick={onResume} autoFocus>
          Lanjutkan
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="glass" size="md" block icon={<Settings size={18} aria-hidden />} onClick={onSettings}>
            Pengaturan
          </Button>
          <Button variant="glass" size="md" block icon={<BookOpen size={18} aria-hidden />} onClick={onHowTo}>
            Cara Main
          </Button>
        </div>
        <Button
          variant="ghost"
          size="md"
          block
          icon={<LogOut size={18} aria-hidden />}
          onClick={onQuit}
          className="mt-1 text-merah-300 hover:bg-merah-500/10"
        >
          Keluar ke Menu
        </Button>
      </div>
    </motion.div>
  );
}

function ConfirmQuit({ onCancel, onConfirm }: { onCancel(): void; onConfirm(): void }) {
  return (
    <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-b from-daun-500 to-daun-600 text-ink-950 shadow-[0_6px_0_#0b7a4f]">
          <Save size={28} aria-hidden />
        </span>
        <h2 id="pause-title" className="mt-3 font-display text-3xl font-bold text-white">
          Keluar ke menu?
        </h2>
        <p className="mt-1 max-w-xs text-sm text-ink-200">
          Progres tersimpan otomatis, bisa dilanjutkan nanti lewat tombol <b className="text-white">Lanjutkan</b> di menu.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="glass" size="lg" block onClick={onCancel} autoFocus>
          Batal
        </Button>
        <Button variant="danger" size="lg" block icon={<LogOut size={20} aria-hidden />} onClick={onConfirm}>
          Keluar
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * In-game pause overlay, driven by `useGame().paused`. Settings and the guide replace the pause card
 * while open (so Escape only closes the top-most layer).
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

  const resume = () => setPaused(false);
  const subtitle = `Ronde ${round}${maxRounds ? ` dari ${maxRounds}` : ''} • Napas dulu, sultan ☕`;
  const cardOpen = paused && (sub === 'main' || sub === 'confirm');

  return (
    <>
      <Modal
        open={cardOpen}
        onClose={sub === 'confirm' ? () => setSub('main') : resume}
        accent="#3A8CD6"
        labelledBy="pause-title"
        className="!max-w-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          {sub === 'confirm' ? (
            <ConfirmQuit key="confirm" onCancel={() => setSub('main')} onConfirm={quitToMenu} />
          ) : (
            <PauseMain
              key="main"
              subtitle={subtitle}
              onResume={resume}
              onSettings={() => setSub('settings')}
              onHowTo={() => setSub('howto')}
              onQuit={() => setSub('confirm')}
            />
          )}
        </AnimatePresence>
      </Modal>

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
