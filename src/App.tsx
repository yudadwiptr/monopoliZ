import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGame, type Screen } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { music, sfx, unlockAudio } from '@/audio';
import { MainMenu } from '@/ui/screens/MainMenu';
import { SetupScreen } from '@/ui/screens/SetupScreen';
import { HowToPlay } from '@/ui/screens/HowToPlay';
import { GameScreen } from '@/ui/screens/GameScreen';
import { ResultsScreen } from '@/ui/screens/ResultsScreen';

const SCREENS: Record<Screen, () => JSX.Element> = {
  menu: MainMenu,
  setup: SetupScreen,
  howto: HowToPlay,
  game: GameScreen,
  results: ResultsScreen,
};

export default function App() {
  const screen = useGame((s) => s.screen);
  const sfxVolume = useSettings((s) => s.sfxVolume);
  const musicVolume = useSettings((s) => s.musicVolume);

  // Browsers only allow audio after a user gesture.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      const s = useGame.getState().screen;
      music.play(s === 'game' ? 'game' : s === 'results' ? 'victory' : 'menu');
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => sfx.setVolume(sfxVolume), [sfxVolume]);
  useEffect(() => music.setVolume(musicVolume), [musicVolume]);

  useEffect(() => {
    if (screen === 'menu' || screen === 'setup' || screen === 'howto') music.play('menu');
  }, [screen]);

  const Current = SCREENS[screen];
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Current />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
