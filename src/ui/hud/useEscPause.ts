import { useEffect } from 'react';
import { useGame } from '@/store/gameStore';

/**
 * Esc toggles pause. Runs in the capture phase so it sees the state before other Esc handlers:
 *  - a HUD sheet or another dismissable dialog is open → leave Esc to that dialog
 *  - paused (only the pause menu open) → resume
 *  - otherwise → pause
 */
export function useEscPause() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || e.defaultPrevented) return;
      const { game, paused, setPaused } = useGame.getState();
      if (!game || game.winner) return;
      if (document.querySelector('[data-hud-sheet]')) return;
      const dialogs = document.querySelectorAll('[role="dialog"]').length;
      if (paused) {
        if (dialogs > 1) return; // e.g. settings opened from the pause menu
        e.stopPropagation();
        setPaused(false);
        return;
      }
      if (dialogs > 0) return;
      e.stopPropagation();
      setPaused(true);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}
