import { tileGridPos } from '@/data/layout';
import type { MapDef, TileDef } from '@/engine/types';

function tileColor(map: MapDef, t: TileDef): string {
  switch (t.kind) {
    case 'city':
      return map.groups.find((g) => g.id === t.group)?.color ?? '#8C96C9';
    case 'tourist':
      return '#22D3C5';
    case 'tax':
      return '#FF3B5C';
    case 'chance':
      return 'rgba(255,255,255,0.35)';
    default:
      return '#FFC21F';
  }
}

/** Tilted isometric silhouette of a map's 32-tile ring (colour groups, wisata, corners). */
export function MiniBoard({ map }: { map: MapDef }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 grid aspect-square h-[78%] grid-cols-9 grid-rows-9 gap-[2px]"
      style={{ transform: 'translate(-50%, -46%) perspective(600px) rotateX(55deg) rotateZ(45deg)' }}
      aria-hidden
    >
      <div
        className="rounded-md"
        style={{ gridRow: '2 / 9', gridColumn: '2 / 9', background: map.theme.boardSurface, opacity: 0.85 }}
      />
      {map.tiles.map((t) => {
        const { row, col } = tileGridPos(t.index);
        return (
          <span
            key={t.index}
            className="rounded-[3px]"
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              background: tileColor(map, t),
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.25)',
            }}
          />
        );
      })}
    </div>
  );
}
