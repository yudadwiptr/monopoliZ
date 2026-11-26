import './board.css';
import {
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '@/audio';
import { mapOf } from '@/engine/selectors';
import type { MapTheme } from '@/engine/types';
import { useGame } from '@/store/gameStore';
import { haptic, speedFactor, useSettings, type CameraMode } from '@/store/settingsStore';
import { BoardHints } from './BoardHints';
import { BuildingsLayer } from './Buildings';
import { CamContext, useCameraRig, useCamValue, useElementSize, useLive, type CameraRig } from './camera';
import { CELL_N, clamp, pawnSpot, project } from './geometry';
import { mix, rgba } from './color';
import { Dice } from './Dice';
import { FxLayer } from './TileFx';
import { PawnsLayer } from './Pawns';
import { MovePreview } from './MovePreview';
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

/** Width (px) of the centre controls at full size — the roll capsule with its Genap/Ganjil chips. */
const CENTER_DESIGN_W = 280;

/** Maximum smooth zoom factor in Mode Fokus (Auto-Zoom). */
const FOCUS_ZOOM_MAX = 1.35;

/**
 * Hardware-accelerated GPU camera controller:
 * - Only triggers ONCE per move toward the final destination tile (`mv.to`), never per intermediate step!
 * - Uses pure CSS `transform: translate3d(Xpx, Ypx, 0) scale3d(S, S, 1)` with `transition: transform 650ms cubic-bezier(0.22, 1, 0.36, 1)`
 *   so the browser's GPU compositor thread animates the camera at a locked 60fps without main-thread spring interrupts.
 */
function useDestinationCamera(rig: CameraRig, enabled: boolean) {
  const [camTransform, setCamTransform] = useState('translate3d(0px, 0px, 0) scale3d(1, 1, 1)');
  const { S, k, tilt, yaw, rigScale, rigY } = rig;

  useEffect(() => {
    let back: ReturnType<typeof setTimeout> | null = null;
    const overview = () => setCamTransform('translate3d(0px, 0px, 0) scale3d(1, 1, 1)');

    if (!enabled) {
      overview();
      return () => {
        if (back) clearTimeout(back);
      };
    }

    const focusDestination = () => {
      const v = useGame.getState().view;
      const mv = v?.moving;
      if (!v || !mv) {
        if (!back) {
          back = setTimeout(() => {
            back = null;
            overview();
          }, 420 * speedFactor());
        }
        return;
      }
      if (back) {
        clearTimeout(back);
        back = null;
      }
      // Compute coordinates of the final destination tile (mv.to) ONCE for the entire move
      const destTile = mv.to ?? v.positions[mv.playerId] ?? 0;
      const spot = pawnSpot(destTile, 0, 1);
      const p = project(spot.u, spot.v, CELL_N * 0.2, tilt.get(), k, yaw.get());
      const rs = rigScale.get();
      const z = FOCUS_ZOOM_MAX;
      // Gentle quadrant pan toward destination tile, clamped so the board edges stay well within view
      const maxPan = S * rs * 0.16;
      const tx = clamp(-p.x * S * rs * 0.42, -maxPan, maxPan);
      const ty = clamp(-(p.y * S * rs + rigY.get()) * 0.42, -maxPan, maxPan);
      setCamTransform(`translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale3d(${z}, ${z}, 1)`);
    };

    // Only subscribe to `s.view.moving` changes (start & end of move), NOT per-step `positions`!
    const unsub = useGame.subscribe((s, prev) => {
      if (s.view?.moving !== prev.view?.moving) {
        focusDestination();
      }
    });
    focusDestination();

    return () => {
      unsub();
      if (back) clearTimeout(back);
    };
  }, [enabled, S, k, tilt, yaw, rigScale, rigY]);

  return camTransform;
}

/** Candidates the human may pick right now (read imperatively so the board never re-renders for it). */
function selectableNow(): number[] {
  const s = useGame.getState();
  const g = s.game;
  if (!g || s.busy || s.paused || g.winner) return [];
  const p = g.players[g.current];
  if (!p || p.isBot || g.pending.kind !== 'choose_tile') return [];
  if (s.localPlayerId && p.id !== s.localPlayerId) return [];
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
  const camTransform = useDestinationCamera(rig, followSetting && !reduce);
  // Screen-space y of the board centre (u=0, v=0) relative to the container centre — keeps roll controls inside the pit.
  const centerY = useLive(
    [rig.tilt, rig.yaw, rig.rigScale, rig.rigY],
    () => project(0.02, 0.02, 0, rig.tilt.get(), rig.k, rig.yaw.get()).y * rig.S * rig.rigScale.get() + rig.rigY.get(),
  );
  // Shrink the centre controls so they always sit inside the middle of the board (phones!).
  const centerScale = useLive([rig.rigScale], () => clamp((rig.c * 6.2 * rig.rigScale.get()) / CENTER_DESIGN_W, 0.5, 1));
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
          {camera !== 'top' && <div className="bz-ambient" aria-hidden />}
          <div className="board-camera-wrapper absolute inset-0" style={{ transform: camTransform }}>
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{ width: S, height: S, marginLeft: -S / 2, marginTop: -S / 2, scale: rig.rigScale, y: rig.rigY }}
            >
              <div className="bz-persp" style={{ perspective: camera === 'top' ? 'none' : `${(k * S).toFixed(1)}px` }}>
                {camera !== 'top' && <motion.div className="bz-slab" style={{ transform: rig.slabTransform }} aria-hidden />}
                <motion.div
                  className="bz-plane"
                  style={{ transform: camera === 'top' ? 'none' : rig.planeTransform }}
                  role="group"
                  aria-label={`Papan ${map.name}`}
                >
                  <div className="bz-rimline" aria-hidden />
                  <TilesLayer map={map} c={rig.c} onPick={onPick} />
                  <div className="bz-light" aria-hidden />
                </motion.div>
              </div>
              {/* Overlay anchors bake the board size into their transforms: rebuild them when it changes (resize / rotate). */}
              <div className="bz-overlay" aria-hidden key={`${S}:${k}`}>
                <BuildingsLayer map={map} />
                <BoardHints />
                <MovePreview />
                <PawnsLayer />
                <Dice />
                <FxLayer />
              </div>
            </motion.div>
          </div>
          {center && (
            <motion.div className="pointer-events-none absolute left-1/2 top-1/2 z-30" style={{ y: centerY, scale: centerScale }}>
              <div className="pointer-events-auto absolute left-0 top-0 w-max -translate-x-1/2 -translate-y-1/2">{center}</div>
            </motion.div>
          )}
        </CamContext.Provider>
      )}
      {map && <TileInfo map={map} target={info} onClose={closeInfo} />}
    </div>
  );
}
