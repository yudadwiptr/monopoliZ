import { useMemo } from 'react';
import { DEFAULT_SALARY, LEVEL_NAMES, tollAt, tollMultiplierAt } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame, useSelectableTiles } from '@/store/gameStore';
import { Tile, type SelState } from './Tile';

interface TilesLayerProps {
  map: MapDef;
  /** cell size in px */
  c: number;
  onPick: (index: number, el: HTMLElement) => void;
}

const EMPTY_SET = new Set<number>();

/**
 * Layered 2D Hand-Drawn Board:
 * - z-index 1: `<img src="/board/board_centerpiece.webp" />` at `inset: 18.5%; width: 63%; height: 63%; object-fit: cover;`
 * - z-index 2: `<img src="/board/board_frame_2d.webp" alt="Board Frame" />` at `inset: 0; width: 100%; height: 100%; object-fit: fill;`
 * - z-index 3: 32-tile transparent CSS Grid at `inset: 5.2%; grid-template-columns: 1.35fr repeat(7, 1fr) 1.35fr;`
 */
export function TilesLayer({ map, onPick }: TilesLayerProps) {
  const tiles = useGame((s) => s.view?.tiles);
  const festival = useGame((s) => s.view?.festivalTile ?? null);
  const players = useGame((s) => s.game?.players);
  const salary = useGame((s) => s.game?.config.salary ?? DEFAULT_SALARY);
  const activeId = useGame((s) => s.view?.activePlayerId ?? '');
  const positions = useGame((s) => s.view?.positions);
  const bankrupt = useGame((s) => s.view?.bankrupt);
  const activePos = useGame((s) => {
    const v = s.view;
    if (!v || v.bankrupt[v.activePlayerId]) return -1;
    return v.positions[v.activePlayerId] ?? -1;
  });
  const alert = useGame((s) => s.alert);
  const selectable = useSelectableTiles();

  const selSet = useMemo(() => (selectable.length ? new Set(selectable) : EMPTY_SET), [selectable]);
  const alertSet = useMemo(() => (alert ? new Set(alert.missing) : EMPTY_SET), [alert]);
  const occupiedSet = useMemo(() => {
    if (!players || !positions) return EMPTY_SET;
    const set = new Set<number>();
    players.forEach((p) => {
      if (!bankrupt?.[p.id] && positions[p.id] !== undefined) set.add(positions[p.id]);
    });
    return set;
  }, [players, positions, bankrupt]);
  const selecting = selSet.size > 0;
  const activeColor = players?.find((p) => p.id === activeId)?.color ?? null;

  if (!tiles || !players) return null;

  return (
    <>
      {/* Layer 1 (z-index: 1): Center Island Diorama tucked inside the inner opening of board_frame_2d.png */}
      <img
        src="/board/board_centerpiece.webp"
        alt=""
        decoding="async"
        draggable={false}
        style={{
          position: 'absolute',
          inset: '22.2%',
          width: '55.6%',
          height: '55.6%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Layer 2 (z-index: 2): Full 2D Hand-Drawn Wooden Frame & Parchment Tile Grid Image */}
      <img
        src="/board/board_frame_2d.webp"
        alt="Board Frame"
        decoding="async"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Layer 3 (z-index: 3): Transparent 32-Tile Interactive Layer aligned to exact tile rects on board_frame_2d.png */}
      <div
        className="bz-grid"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
        }}
      >
        {map.tiles.map((def) => {
          const t = tiles[def.index];
          const owner = t?.owner ? players.find((p) => p.id === t.owner) ?? null : null;
          const value = owner ? tollAt(map.tiles, tiles, def.index, festival) : def.price ?? 0;
          const mult = owner ? tollMultiplierAt(map.tiles, tiles, def.index, festival) : 1;
          const sel: SelState = selecting ? (selSet.has(def.index) ? 'pick' : 'dim') : 'none';
          return (
            <Tile
              key={def.index}
              def={def}
              bandColor={def.group !== undefined ? map.groups[def.group]?.color ?? null : null}
              ownerColor={owner?.color ?? null}
              ownerName={owner?.name ?? null}
              levelName={owner && def.kind === 'city' ? LEVEL_NAMES[t.level] ?? null : null}
              value={value}
              mult={mult}
              festival={festival === def.index}
              sel={sel}
              alert={alertSet.has(def.index)}
              here={!selecting && activePos === def.index ? activeColor : null}
              hasPawn={occupiedSet.has(def.index)}
              salary={salary}
              onPick={onPick}
            />
          );
        })}
      </div>
    </>
  );
}
