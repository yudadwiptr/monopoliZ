/**
 * Phone landscape helpers.
 *
 * Browsers only let a page lock orientation while it is fullscreen (Android Chrome & co.). iPhone Safari
 * supports neither, so there the game shows a "putar HP" gate instead (see RotateGate).
 */

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait') => Promise<void>;
  unlock?: () => void;
};

/** Touch device with a phone-sized short edge (tablets keep their portrait layout). */
export function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const shortEdge = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return coarse && shortEdge > 0 && shortEdge < 600;
}

export function isPortrait(): boolean {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
}

/** Whether this browser can go fullscreen and lock to landscape (false on iPhone). */
export function canLockLandscape(): boolean {
  if (typeof document === 'undefined') return false;
  const o = (screen as Screen & { orientation?: LockableOrientation }).orientation;
  return !!document.fullscreenEnabled && typeof o?.lock === 'function';
}

/**
 * Fullscreen + landscape lock on phones. Must run soon after a user gesture (tap); failures are silent —
 * the rotate gate covers browsers that refuse.
 */
export async function enterLandscape(): Promise<void> {
  if (!isPhone() || !canLockLandscape()) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as LockableOrientation).lock?.('landscape');
  } catch {
    /* refused (no gesture, iframe, desktop…) — the rotate gate handles it */
  }
}

export function releaseLandscape(): void {
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    /* ignore */
  }
}
