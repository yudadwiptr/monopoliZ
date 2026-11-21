/**
 * MonopoliZ audio — everything is synthesized live with the Web Audio API (no audio files).
 *
 * Safe to call anywhere: before unlockAudio(), without Web Audio, or in node/vitest every call is
 * a silent no-op and never throws.
 */
import { setBusVolume, unlockContext } from './context';
import { playMusic, startWantedMusic, stopMusic } from './music';
import { playSfx } from './sfx';
import type { MusicTrack, SfxName } from './types';

export type { MusicTrack, SfxName } from './types';

/** Swallow anything unexpected: audio must never take the game down. */
function guard(fn: () => void): void {
  try {
    fn();
  } catch {
    /* ignore */
  }
}

export const sfx = {
  play(name: SfxName, opts?: { volume?: number; pitch?: number }): void {
    guard(() => playSfx(name, opts));
  },
  /** 0..1 (perceptual curve applied internally; 0 = silent). */
  setVolume(v: number): void {
    guard(() => setBusVolume('sfx', v));
  },
};

export const music = {
  /** Crossfades to `track`; no-op if it is already playing. Remembered until audio is unlocked. */
  play(track: MusicTrack): void {
    guard(() => playMusic(track));
  },
  /** Fades the current track out. */
  stop(): void {
    guard(() => stopMusic());
  },
  /** 0..1 (perceptual curve applied internally; 0 = silent). */
  setVolume(v: number): void {
    guard(() => setBusVolume('music', v));
  },
};

/** Call from the first user gesture (pointerdown/keydown) to create/resume the AudioContext. */
export function unlockAudio(): void {
  guard(() => {
    if (unlockContext()) startWantedMusic();
  });
}
