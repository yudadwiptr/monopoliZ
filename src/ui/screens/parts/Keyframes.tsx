/**
 * Keyframes used by the menu/meta screens. Transform/opacity only (60fps, compositor friendly).
 * Rendering <Keyframes /> more than once is harmless.
 */
const CSS = `
@keyframes mz-drift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--r0, 0deg)); }
  50% { transform: translate3d(var(--dx, 0px), var(--dy, -14px), 0) rotate(var(--r1, 0deg)); }
}
@keyframes mz-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.95; } }
@keyframes mz-breathe {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.07); }
}
@keyframes mz-spin-y { to { transform: rotateY(360deg); } }
@keyframes mz-rays { to { transform: rotate(360deg); } }
@keyframes mz-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes mz-shine {
  0% { transform: translateX(-160%) skewX(-20deg); }
  55%, 100% { transform: translateX(420%) skewX(-20deg); }
}
@keyframes mz-gauge {
  0% { transform: scaleX(0.05); }
  50% { transform: scaleX(1); }
  100% { transform: scaleX(0.05); }
}
@keyframes mz-gauge-cover {
  0% { transform: scaleX(0.95); }
  50% { transform: scaleX(0); }
  100% { transform: scaleX(0.95); }
}
@keyframes mz-pay {
  0% { transform: translateX(-56px) scale(0.6); opacity: 0; }
  15% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(56px) scale(1.05); opacity: 0; }
}
@keyframes mz-pop {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes mz-roll {
  0%, 70%, 100% { transform: rotate(0deg) translateY(0); }
  10% { transform: rotate(-18deg) translateY(-10px); }
  25% { transform: rotate(14deg) translateY(-4px); }
  40% { transform: rotate(-6deg) translateY(0); }
}
`;

export function Keyframes() {
  return <style>{CSS}</style>;
}
