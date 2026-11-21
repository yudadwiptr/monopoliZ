import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameSpeed = 'santai' | 'normal' | 'ngebut';
export type CameraMode = '3d' | 'top';

/** Multiplier applied to every animation duration. */
export const SPEED_FACTOR: Record<GameSpeed, number> = {
  santai: 1.3,
  normal: 1,
  ngebut: 0.5,
};

export const SPEED_LABEL: Record<GameSpeed, string> = {
  santai: 'Santai',
  normal: 'Normal',
  ngebut: 'Ngebut',
};

interface SettingsState {
  sfxVolume: number; // 0..1
  musicVolume: number; // 0..1
  speed: GameSpeed;
  camera: CameraMode;
  haptics: boolean;
  setSfxVolume(v: number): void;
  setMusicVolume(v: number): void;
  setSpeed(s: GameSpeed): void;
  setCamera(c: CameraMode): void;
  setHaptics(h: boolean): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sfxVolume: 0.7,
      musicVolume: 0.35,
      speed: 'normal',
      camera: '3d',
      haptics: true,
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(1, v)) }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
      setSpeed: (speed) => set({ speed }),
      setCamera: (camera) => set({ camera }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: 'monopoliz.settings.v1' },
  ),
);

export function speedFactor(): number {
  return SPEED_FACTOR[useSettings.getState().speed] ?? 1;
}

/** Light vibration on supported phones. */
export function haptic(pattern: number | number[] = 12): void {
  if (!useSettings.getState().haptics) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
