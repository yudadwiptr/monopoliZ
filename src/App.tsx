import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { useGame, type Screen } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { music, sfx, unlockAudio } from '@/audio';
import { MainMenu } from '@/ui/screens/MainMenu';

// Only the main menu ships in the first bundle; the other screens are separate chunks, fetched in the
// background right after the menu shows (so tapping "Main" is still instant).
const loadSetup = () => import('@/ui/screens/SetupScreen').then((m) => ({ default: m.SetupScreen }));
const loadOnline = () => import('@/ui/screens/OnlineLobbyScreen').then((m) => ({ default: m.OnlineLobbyScreen }));
const loadHowTo = () => import('@/ui/screens/HowToPlay').then((m) => ({ default: m.HowToPlay }));
const loadGame = () => import('@/ui/screens/GameScreen').then((m) => ({ default: m.GameScreen }));
const loadResults = () => import('@/ui/screens/ResultsScreen').then((m) => ({ default: m.ResultsScreen }));
const SetupScreen = lazy(loadSetup);
const OnlineLobbyScreen = lazy(loadOnline);
const HowToPlay = lazy(loadHowTo);
const GameScreen = lazy(loadGame);
const ResultsScreen = lazy(loadResults);

/** Warm the other screens' code and the in-game art once the menu is up. */
function prefetchGame() {
  void loadGame();
  void loadSetup();
  void loadResults();
  void loadHowTo();
  void loadOnline();
  const base = import.meta.env.BASE_URL;
  ['board/board_frame_2d.webp', 'board/board_centerpiece.webp', 'board/ingame_bg_2d.webp', 'sprites/icons_chibi_sheet.webp'].forEach(
    (path) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${base}${path}`;
    },
  );
}

const SCREENS: Record<Screen, ComponentType> = {
  menu: MainMenu,
  setup: SetupScreen,
  online: OnlineLobbyScreen,
  howto: HowToPlay,
  game: GameScreen,
  results: ResultsScreen,
};

export default function App() {
  const screen = useGame((s) => s.screen);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(prefetchGame);
    else setTimeout(prefetchGame, 1200);
  }, []);
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

  // If opened with an invite link (?room=XXXXX), jump straight into the Online Lobby.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
        useGame.getState().setScreen('online');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (screen === 'menu' || screen === 'setup' || screen === 'online' || screen === 'howto') music.play('menu');
  }, [screen]);

  const Current = SCREENS[screen];
  return (
    <div className="relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-ink-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="absolute inset-0 will-change-[opacity,transform]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Suspense fallback={<div className="h-full w-full bg-[#163d4a]" />}>
            <Current />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
