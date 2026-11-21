export type SfxName =
  | 'click'
  | 'hover'
  | 'open'
  | 'close'
  | 'dice_shake'
  | 'dice_land'
  | 'step'
  | 'coin_in'
  | 'coin_out'
  | 'buy'
  | 'build'
  | 'landmark'
  | 'acquire'
  | 'card'
  | 'festival'
  | 'fly'
  | 'island'
  | 'bankrupt'
  | 'win'
  | 'lose'
  | 'alert'
  | 'turn'
  | 'error'
  | 'whoosh'
  | 'gauge';

export type MusicTrack = 'menu' | 'game' | 'victory';

export interface SfxOptions {
  /** 0..1, relative to the global sfx volume. */
  volume?: number;
  /** Pitch multiplier (1 = normal). */
  pitch?: number;
}
