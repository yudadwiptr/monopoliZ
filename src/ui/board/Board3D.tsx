import './board.css';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '@/audio';
import { mapOf } from '@/engine/selectors';
import type { MapTheme } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { haptic, speedFactor, useSettings, type CameraMode } from '@/store/settingsStore';
import { BoardHints } from './BoardHints';
import { BuildingsLayer } from './Buildings';
import { CamContext, useCameraRig, useCamValue, useElementSize, type CameraRig } from './camera';
import { CELL_N, clamp, pawnSpot, project } from './geometry';
import { mix, rgba } from './color';
import { Dice } from './Dice';
import { FxLayer } from './TileFx';
import { PawnsLayer } from './Pawns';
import { TileInfo, type TileInfoTarget } from './TileInfo';
import { TilesLayer } from './TilesLayer';

/** Board colours derived from the active map's theme, exposed as the --bz-* custom properties board.css uses. */
function themeVars(theme: MapTheme, c: number, camera: CameraMode): CSSProperties {
  const s = theme.boardSurface;
  const a = theme.accent;
  const iso = camera === 'iso';
  return {
    '--c': `${c}px`,
    '--bz-counter-yaw': iso ? '-45deg' : '0deg',
    '--bz-surface': mix(s, '#05081A', 0.28),
    '--bz-tile-hi': mix(s, '#FFFFFF', 0.16),
    '--bz-tile-lo': mix(s, '#05081A', 0.18),
    '--bz-rim-hi': mix(mix(s, a, 0.26), '#FFFFFF', 0.12),
    '--bz-rim-lo': mix(s, '#05081A', 0.36),
    '--bz-slab-hi': mix(s, '#05081A', 0.42),
    '--bz-slab-lo': mix(s, '#000000', 0.82),
    '--bz-accent': a,
    '--bz-accent-soft': rgba(a, 0.48),
    '--bz-accent-glow': rgba(a, 0.28),
    '--bz-glow': rgba(a, 0.18),
  } as CSSProperties;
}

/** On-screen size (px) a tile should reach while the camera follows a pawn. */
const FOLLOW_CELL_PX = 76;

/**
 * Follow camera: while a pawn moves, zoom in and pan so it stays centred; shortly after it lands, ease back
 * to the whole board. Drives three motion values on a wrapper around the rig — no React re-renders.
 */
function useFollowCamera(rig: CameraRig, enabled: boolean) {
  const zoom = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const { S, c, k, tilt, yaw, rigScale, rigY } = rig;

  useEffect(() => {
    const ctl: AnimationPlaybackControls[] = [];
    let back: ReturnType<typeof setTimeout> | null = null;
    const go = (z: number, x: number, y: number, soft: boolean) => {
      ctl.splice(0).forEach((a) => a.stop());
      const t = soft
        ? { type: 'spring' as const, stiffness: 70, damping: 20 }
        : { type: 'spring' as const, stiffness: 140, damping: 24 };
      ctl.push(animate(zoom, z, t), animate(panX, x, t), animate(panY, y, t));
    };
    const overview = () => go(1, 0, 0, true);
    if (!enabled) {
      overview();
      return () => ctl.forEach((a) => a.stop());
    }

    const focus = () => {
      const v = useGame.getState().view;
      const mv = v?.moving;
      if (!v || !mv) {
        if (!back && zoom.get() !== 1) back = setTimeout(() => ((back = null), overview()), 700 * speedFactor());
        return;
      }
      if (back) {
        clearTimeout(back);
        back = null;
      }
      const spot = pawnSpot(v.positions[mv.playerId] ?? 0, 0, 1);
      const p = project(spot.u, spot.v, CELL_N * 0.35, tilt.get(), k, yaw.get());
      const rs = rigScale.get();
      const ox = p.x * S * rs;
      const oy = p.y * S * rs + rigY.get();
      const z = clamp(FOLLOW_CELL_PX / Math.max(1, c * rs), 1.12, 2.1);
      go(z, -ox * z, -oy * z, false);
    };

    const unsub = useGame.subscribe((s, prev) => {
      if (s.view?.moving !== prev.view?.moving || s.view?.positions !== prev.view?.positions) focus();
    });
    focus();
    return () => {
      unsub();
      if (back) clearTimeout(back);
      ctl.forEach((a) => a.stop());
    };
  }, [enabled, S, c, k, tilt, yaw, rigScale, rigY, zoom, panX, panY]);

  return { zoom, panX, panY };
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
 * The game board: an isometric diamond, a perspective-tilted, or a flat ('top') 3D slab with the tile ring on its
 * surface, plus an upright billboard overlay for buildings, pawns, dice and effects. Fills its parent and
 * keeps the square board fitted to it for every camera. `center` (the roll button) sits inside the center pit.
 */
export function Board3D({ center }: { center?: ReactNode } = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(rootRef);
  const camera = useSettings((s) => s.camera);
  const map = useGame((s) => (s.game ? mapOf(s.game) : null));
  const rig = useCameraRig(w, h, camera);
  const cam = useCamValue(rig);
  const followSetting = useSettings((s) => s.followCam);
  const reduce = useReducedMotion();
  const follow = useFollowCamera(rig, followSetting && !reduce);
  // Screen-space y of the board centre (u=0, v=0) relative to the container centre — keeps roll controls inside the pit.
  const centerY = useTransform(
    [rig.tilt, rig.yaw, rig.rigScale, rig.rigY] as MotionValue<number>[],
    ([t, y, rs, ry]: number[]) => project(0.02, 0.02, 0, t, rig.k, y).y * rig.S * rs + ry,
  );
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

  const vars = useMemo(() => (map ? themeVars(map.theme, rig.c, camera) : undefined), [map, rig.c, camera]);
  const { S, k } = rig;
  const ready = !!map && w > 0 && h > 0;

  return (
    <div ref={rootRef} className="relative h-full w-full select-none overflow-hidden" style={vars}>
      {ready && map && (
        <CamContext.Provider value={cam}>
          <div className="bz-ambient" aria-hidden />
          <motion.div className="absolute inset-0" style={{ scale: follow.zoom, x: follow.panX, y: follow.panY }}>
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{ width: S, height: S, marginLeft: -S / 2, marginTop: -S / 2, scale: rig.rigScale, y: rig.rigY }}
            >
              <div className="bz-persp" style={{ perspective: `${(k * S).toFixed(1)}px` }}>
                <motion.div className="bz-slab" style={{ transform: rig.slabTransform }} aria-hidden />
                <motion.div
                  className="bz-plane"
                  style={{ transform: rig.planeTransform }}
                  role="group"
                  aria-label={`Papan ${map.name}`}
                >
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
          </motion.div>
          {center && (
            <motion.div className="pointer-events-none absolute left-1/2 top-1/2 z-30" style={{ y: centerY }}>
              <div className="pointer-events-auto absolute left-0 top-0 w-max -translate-x-1/2 -translate-y-1/2">{center}</div>
            </motion.div>
          )}
        </CamContext.Provider>
      )}
      {map && <TileInfo map={map} target={info} onClose={closeInfo} />}
    </div>
  );
}
