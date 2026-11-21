import './board.css';
import { motion } from 'framer-motion';
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '@/audio';
import { mapOf } from '@/engine/selectors';
import type { MapTheme } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { haptic, useSettings } from '@/store/settingsStore';
import { BoardHints } from './BoardHints';
import { BuildingsLayer } from './Buildings';
import { CamContext, useCameraRig, useCamValue, useElementSize } from './camera';
import { mix, rgba } from './color';
import { Dice } from './Dice';
import { FxLayer } from './TileFx';
import { PawnsLayer } from './Pawns';
import { TileInfo, type TileInfoTarget } from './TileInfo';
import { TilesLayer } from './TilesLayer';

/** Board colours derived from the active map's theme, exposed as the --bz-* custom properties board.css uses. */
function themeVars(theme: MapTheme, c: number): CSSProperties {
  const s = theme.boardSurface;
  const a = theme.accent;
  return {
    '--c': `${c}px`,
    '--bz-surface': mix(s, '#05081A', 0.25),
    '--bz-tile-hi': mix(s, '#FFFFFF', 0.13),
    '--bz-tile-lo': mix(s, '#05081A', 0.12),
    '--bz-rim-hi': mix(mix(s, a, 0.22), '#FFFFFF', 0.08),
    '--bz-rim-lo': mix(s, '#05081A', 0.3),
    '--bz-slab-hi': mix(s, '#05081A', 0.45),
    '--bz-slab-lo': mix(s, '#000000', 0.78),
    '--bz-accent': a,
    '--bz-accent-soft': rgba(a, 0.42),
    '--bz-accent-glow': rgba(a, 0.24),
    '--bz-glow': rgba(a, 0.16),
  } as CSSProperties;
}

/** Candidates the human may pick right now (read imperatively so the board never re-renders for it). */
function selectableNow(): number[] {
  const s = useGame.getState();
  const g = s.game;
  if (!g || s.busy || s.paused || g.winner) return [];
  const p = g.players[g.current];
  if (!p || p.isBot || g.pending.kind !== 'choose_tile') return [];
  return g.pending.candidates;
}

/**
 * The game board: a perspective-tilted (or flat, in 'top' camera) 3D slab with the tile ring on its
 * surface, plus an upright billboard overlay for buildings, pawns, dice and effects. Fills its parent and
 * keeps the square board fitted to it for both cameras.
 */
export function Board3D() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(rootRef);
  const camera = useSettings((s) => s.camera);
  const map = useGame((s) => (s.game ? mapOf(s.game) : null));
  const rig = useCameraRig(w, h, camera);
  const cam = useCamValue(rig);
  const [info, setInfo] = useState<TileInfoTarget | null>(null);

  const onPick = useCallback((index: number, el: HTMLElement) => {
    if (selectableNow().includes(index)) {
      haptic(12);
      setInfo(null);
      useGame.getState().act({ type: 'CHOOSE_TILE', tile: index });
      return;
    }
    sfx.play('click');
    setInfo((cur) => (cur?.index === index ? null : { index, rect: el.getBoundingClientRect() }));
  }, []);
  const closeInfo = useCallback(() => setInfo(null), []);

  const vars = useMemo(() => (map ? themeVars(map.theme, rig.c) : undefined), [map, rig.c]);
  const { S, k } = rig;
  const ready = !!map && w > 0 && h > 0;

  return (
    <div ref={rootRef} className="relative h-full w-full select-none" style={vars}>
      {ready && map && (
        <CamContext.Provider value={cam}>
          <div className="bz-ambient" aria-hidden />
          <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ width: S, height: S, marginLeft: -S / 2, marginTop: -S / 2, scale: rig.rigScale, y: rig.rigY }}
          >
            <div className="bz-persp" style={{ perspective: `${(k * S).toFixed(1)}px` }}>
              <motion.div className="bz-slab" style={{ transform: rig.slabTransform }} aria-hidden />
              <motion.div className="bz-plane" style={{ transform: rig.planeTransform }} role="group" aria-label={`Papan ${map.name}`}>
                <div className="bz-rimline" aria-hidden />
                <TilesLayer map={map} c={rig.c} onPick={onPick} />
                <div className="bz-light" aria-hidden />
              </motion.div>
            </div>
            <div className="bz-overlay" aria-hidden>
              <BuildingsLayer map={map} />
              <BoardHints />
              <PawnsLayer />
              <Dice />
              <FxLayer />
            </div>
          </motion.div>
        </CamContext.Provider>
      )}
      {map && <TileInfo map={map} target={info} onClose={closeInfo} />}
    </div>
  );
}
