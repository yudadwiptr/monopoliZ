/**
 * Phone display helpers.
 *
 * Nothing here forces an orientation: MonopoliZ plays in portrait and landscape. iPhone Safari cannot go
 * fullscreen from a web page, so there the real fullscreen is "Tambahkan ke Layar Utama" (standalone mode,
 * no Safari bars). Android browsers can enter fullscreen on a tap.
 */

/** Touch device with a phone-sized short edge (tablets are excluded). */
export function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const shortEdge = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  return coarse && shortEdge > 0 && shortEdge < 600;
}

export function isPortrait(): boolean {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
}

/** iPhone / iPod (iPadOS reports itself as Mac and is not a phone anyway). */
export function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPod/i.test(navigator.userAgent);
}

/** Running from the home screen (PWA / standalone), i.e. without browser bars. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches;
}

/** Whether a tap can put the page in fullscreen (Android & desktop browsers; never iPhone). */
export function canFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenEnabled && !isIOS();
}

export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenElement;
}

/** Fullscreen without locking the orientation — the player can still turn the phone. Must run on a tap. */
export async function enterFullscreen(): Promise<void> {
  if (!canFullscreen() || isFullscreen()) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* refused — nothing else to do */
  }
}
