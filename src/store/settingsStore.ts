import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiceSkin } from '@/data/diceSkins';

export type GameSpeed = 'santai' | 'normal' | 'ngebut';
export type CameraMode = 'iso' | '3d' | 'top';

export const CAMERA_LABEL: Record<CameraMode, string> = { iso: 'Isometrik', '3d': '3D', top: 'Atas' };

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
  /** Zoom & pan to the moving pawn, then back to the whole board. */
  followCam: boolean;
  diceSkin: DiceSkin;
  setSfxVolume(v: number): void;
  setMusicVolume(v: number): void;
  setSpeed(s: GameSpeed): void;
  setCamera(c: CameraMode): void;
  setHaptics(h: boolean): void;
  setFollowCam(f: boolean): void;
  setDiceSkin(s: DiceSkin): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sfxVolume: 0.7,
      musicVolume: 0.35,
      speed: 'normal',
      camera: 'iso',
      haptics: true,
      followCam: true,
      diceSkin: 'klasik',
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(1, v)) }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
      setSpeed: (speed) => set({ speed }),
      setCamera: (camera) => set({ camera }),
      setHaptics: (haptics) => set({ haptics }),
      setFollowCam: (followCam) => set({ followCam }),
      setDiceSkin: (diceSkin) => set({ diceSkin }),
    }),
    {
      name: 'monopoliz.settings.v1',
      version: 2,
      // v2: new isometric camera becomes the default; follow camera added.
      migrate: (old, from) => {
        const prev = (old ?? {}) as Partial<SettingsState>;
        return from < 2 ? { ...prev, camera: 'iso', followCam: true } : prev;
      },
    },
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
