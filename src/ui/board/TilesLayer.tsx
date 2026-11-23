import { memo, useMemo } from 'react';
import { DEFAULT_SALARY, LEVEL_NAMES, tollAt, tollMultiplierAt } from '@/engine/economy';
import type { MapDef } from '@/engine/types';
import { useGame, useSelectableTiles } from '@/store/gameStore';
import { Logo } from '@/ui/common';
import { clamp, CORNER_K, RIM_K } from './geometry';
import { Tile, type SelState } from './Tile';

interface TilesLayerProps {
  map: MapDef;
  /** cell size in px */
  c: number;
  onPick: (index: number, el: HTMLElement) => void;
}

const EMPTY_SET = new Set<number>();

/** The 32 tiles + recessed Get Rich center pit, laid out on the (tilted) board plane. */
export function TilesLayer({ map, c, onPick }: TilesLayerProps) {
  const tiles = useGame((s) => s.view?.tiles);
  const festival = useGame((s) => s.view?.festivalTile ?? null);
  const players = useGame((s) => s.game?.players);
  const salary = useGame((s) => s.game?.config.salary ?? DEFAULT_SALARY);
  const activeId = useGame((s) => s.view?.activePlayerId ?? '');
  const activePos = useGame((s) => {
    const v = s.view;
    if (!v || v.bankrupt[v.activePlayerId]) return -1;
    return v.positions[v.activePlayerId] ?? -1;
  });
  const alert = useGame((s) => s.alert);
  const selectable = useSelectableTiles();

  const selSet = useMemo(() => (selectable.length ? new Set(selectable) : EMPTY_SET), [selectable]);
  const alertSet = useMemo(() => (alert ? new Set(alert.missing) : EMPTY_SET), [alert]);
  const selecting = selSet.size > 0;
  const activeColor = players?.find((p) => p.id === activeId)?.color ?? null;

  if (!tiles || !players) return null;

  return (
    <div
      className="bz-grid"
      style={{
        inset: RIM_K * c,
        gridTemplateColumns: `${CORNER_K}fr repeat(7, 1fr) ${CORNER_K}fr`,
        gridTemplateRows: `${CORNER_K}fr repeat(7, 1fr) ${CORNER_K}fr`,
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
            salary={salary}
            onPick={onPick}
          />
        );
      })}
      <BoardCenter map={map} logoScale={clamp(c / 44, 0.7, 2.1)} />
    </div>
  );
}

interface CenterProps {
  map: MapDef;
  logoScale: number;
}

/**
 * Recessed 3D Center Pit:
 * - Stepped 3D cliff walls around the inner perimeter
 * - Counter-rotated watermark emblem & map wordmark in the middle of the arena floor
 */
const BoardCenter = memo(function BoardCenter({ map, logoScale }: CenterProps) {
  return (
    <div className="bz-center" style={{ gridRow: '2 / 9', gridColumn: '2 / 9' }} aria-hidden>
      <div className="bz-center-ring" />
      <div className="bz-center-arena">
        <div className="bz-emblem">{map.theme.emblem}</div>
        <div className="bz-center-head">
          <div
            style={{
              transform: `scale(${logoScale * 0.88})`,
              transformOrigin: '50% 50%',
              opacity: 0.35,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
            }}
          >
            <Logo size="sm" />
          </div>
          <div className="bz-mapname">{map.name}</div>
          <div className="bz-tagline">{map.tagline}</div>
        </div>
      </div>
    </div>
  );
});
