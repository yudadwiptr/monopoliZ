/**
 * The table the board sits on: dark walnut planks with grain, a warm lamp pool over the board and a
 * vignette — everything is CSS, no image assets.
 */
const TABLE_WOOD = [
  // warm lamp light over the middle of the table
  'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255, 196, 130, 0.16), transparent 70%)',
  // plank seams
  'repeating-linear-gradient(90deg, transparent 0 238px, rgba(0, 0, 0, 0.38) 238px 240px, rgba(255, 214, 170, 0.05) 240px 241px)',
  // long grain
  'repeating-linear-gradient(91deg, rgba(0, 0, 0, 0.09) 0 2px, transparent 2px 11px, rgba(255, 220, 180, 0.035) 11px 13px, transparent 13px 31px)',
  // fine grain
  'repeating-linear-gradient(89deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 5px)',
  // per-plank tone variation
  'repeating-linear-gradient(90deg, rgba(255, 210, 160, 0.04) 0 240px, rgba(0, 0, 0, 0.06) 240px 480px, rgba(255, 210, 160, 0.02) 480px 720px)',
  'linear-gradient(180deg, #4a2d18 0%, #3a2312 50%, #2a180b 100%)',
].join(', ');

export function GameBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: TABLE_WOOD }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(14,7,2,0.7)_100%)]" />
    </div>
  );
}
