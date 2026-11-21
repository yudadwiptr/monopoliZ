/**
 * Game store — glue between the pure engine, the bots and the animated UI.
 *
 * Flow:  act(action) → engine.applyAction → events pushed to `queue` → events are replayed one by one
 *        (updating the `view` model + spawning `fx`) with per-event durations → when the queue drains the
 *        view is re-synced from `game`, the game is autosaved, then either END_TURN is auto-dispatched,
 *        a bot decides, or we wait for the human.
 *
 * UI components should render from `view` (positions, displayed cash, ownership) and from `game` (pending
 * decision, players, settings). Decision UI must only be shown when `busy === false`.
 */
import { create } from 'zustand';
import { applyAction, createGame, listLegalActions } from '@/engine/game';
import { decideBotAction } from '@/ai/bot';
import { music, sfx } from '@/audio';
import { BOARD_SIZE } from '@/data/layout';
import { speedFactor, haptic } from './settingsStore';
import type { Action, GameConfig, GameEvent, GameState, WinReason } from '@/engine/types';

export type Screen = 'menu' | 'setup' | 'game' | 'howto' | 'results';

export interface ViewTile {
  owner: string | null;
  level: number;
}

export interface ViewState {
  positions: Record<string, number>;
  cash: Record<string, number>;
  tiles: ViewTile[];
  festivalTile: number | null;
  bankrupt: Record<string, boolean>;
  dice: [number, number] | null;
  diceRolling: boolean;
  activePlayerId: string;
  moving: { playerId: string; mode: 'walk' | 'fly' | 'jump' } | null;
  /** Player whose island status changed recently (for UI badges) */
  islandTurns: Record<string, number>;
}

export type FxKind =
  | 'money'
  | 'salary'
  | 'text'
  | 'buy'
  | 'build'
  | 'landmark'
  | 'acquire'
  | 'festival'
  | 'bankrupt'
  | 'shield';

export interface Fx {
  id: number;
  kind: FxKind;
  tile?: number; // board anchor
  playerId?: string; // panel anchor
  amount?: number; // signed for money: + received, - paid (relative to playerId)
  text?: string;
  tone: 'good' | 'bad' | 'info';
}

export interface MonopolyAlert {
  playerId: string;
  reason: WinReason;
  missing: number[];
}

interface GameStore {
  screen: Screen;
  game: GameState | null;
  view: ViewState | null;
  queue: GameEvent[];
  currentEvent: GameEvent | null;
  busy: boolean;
  fx: Fx[];
  alert: MonopolyAlert | null;
  paused: boolean;
  error: string | null;
  /** Bumps on every "big moment" (bankrupt, landmark, huge toll) — UI can shake the screen. */
  shake: number;

  setScreen(s: Screen): void;
  startGame(config: GameConfig): void;
  restartSame(): void;
  continueGame(): boolean;
  hasSave(): boolean;
  act(action: Action): void;
  setPaused(p: boolean): void;
  quitToMenu(): void;
  clearError(): void;
}

const SAVE_KEY = 'monopoliz.save.v1';
let generation = 0; // bumps to cancel running loops/timers when a game ends or restarts
let fxSeq = 1;
let running = false;
let botFailures = 0;

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, Math.max(0, ms * speedFactor())));

export function viewFromState(game: GameState): ViewState {
  const positions: Record<string, number> = {};
  const cash: Record<string, number> = {};
  const bankrupt: Record<string, boolean> = {};
  const islandTurns: Record<string, number> = {};
  game.players.forEach((p) => {
    positions[p.id] = p.position;
    cash[p.id] = p.cash;
    bankrupt[p.id] = p.bankrupt;
    islandTurns[p.id] = p.islandTurns;
  });
  return {
    positions,
    cash,
    bankrupt,
    islandTurns,
    tiles: game.tiles.map((t) => ({ owner: t.owner, level: t.level })),
    festivalTile: game.festivalTile,
    dice: game.lastDice,
    diceRolling: false,
    activePlayerId: game.players[game.current]?.id ?? '',
    moving: null,
  };
}

function saveGame(game: GameState | null) {
  try {
    if (!game || game.winner) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    /* storage may be unavailable */
  }
}

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (g?.version !== 1 || !Array.isArray(g.players)) return null;
    return g;
  } catch {
    return null;
  }
}

export const useGame = create<GameStore>()((set, get) => {
  // ───────────── helpers that mutate view ─────────────
  const patchView = (fn: (v: ViewState) => Partial<ViewState>) => {
    const v = get().view;
    if (!v) return;
    set({ view: { ...v, ...fn(v) } });
  };

  const pushFx = (fx: Omit<Fx, 'id'>, ttl = 1700) => {
    const id = fxSeq++;
    const gen = generation;
    set({ fx: [...get().fx, { ...fx, id }].slice(-24) });
    setTimeout(() => {
      if (gen !== generation) return;
      set({ fx: get().fx.filter((f) => f.id !== id) });
    }, ttl);
  };

  const humanInvolved = (id: string | null | undefined) => {
    const g = get().game;
    return !!g && !!id && !!g.players.find((p) => p.id === id && !p.isBot);
  };

  // ───────────── per-event animation ─────────────
  async function playEvent(ev: GameEvent, gen: number): Promise<void> {
    const alive = () => gen === generation;
    switch (ev.type) {
      case 'turn_start': {
        patchView(() => ({ activePlayerId: ev.playerId, dice: null }));
        sfx.play('turn');
        await sleep(650);
        return;
      }
      case 'dice': {
        patchView(() => ({ dice: ev.dice, diceRolling: true }));
        sfx.play('dice_shake');
        await sleep(880);
        if (!alive()) return;
        patchView(() => ({ diceRolling: false }));
        sfx.play('dice_land');
        haptic(18);
        if (ev.doubles) pushFx({ kind: 'text', text: 'DOUBLE! 🎲', tone: 'good', playerId: ev.playerId });
        await sleep(ev.doubles ? 680 : 500);
        return;
      }
      case 'move': {
        if (ev.mode === 'walk' && ev.steps !== 0) {
          const dir = ev.steps > 0 ? 1 : -1;
          patchView(() => ({ moving: { playerId: ev.playerId, mode: 'walk' } }));
          let pos = ev.from;
          for (let s = 0; s < Math.abs(ev.steps); s++) {
            if (!alive()) return;
            pos = (pos + dir + BOARD_SIZE) % BOARD_SIZE;
            const p = pos;
            patchView((v) => ({ positions: { ...v.positions, [ev.playerId]: p } }));
            sfx.play('step', { pitch: 1 + (s % 4) * 0.04 });
            await sleep(230);
          }
          patchView(() => ({ moving: null }));
          await sleep(120);
        } else {
          patchView((v) => ({
            moving: { playerId: ev.playerId, mode: ev.mode },
            positions: { ...v.positions, [ev.playerId]: ev.to },
          }));
          sfx.play(ev.mode === 'fly' ? 'fly' : 'whoosh');
          await sleep(ev.mode === 'fly' ? 1300 : 650);
          patchView(() => ({ moving: null }));
        }
        return;
      }
      case 'transfer': {
        patchView((v) => {
          const cash = { ...v.cash };
          if (ev.from) cash[ev.from] = (cash[ev.from] ?? 0) - ev.amount;
          if (ev.to) cash[ev.to] = (cash[ev.to] ?? 0) + ev.amount;
          return { cash };
        });
        if (ev.amount <= 0) return;
        const isSalary = ev.reason === 'salary';
        if (ev.from) pushFx({ kind: 'money', playerId: ev.from, tile: ev.tile, amount: -ev.amount, tone: 'bad' });
        if (ev.to)
          pushFx({
            kind: isSalary ? 'salary' : 'money',
            playerId: ev.to,
            tile: ev.tile,
            amount: ev.amount,
            tone: 'good',
          });
        sfx.play(ev.to && humanInvolved(ev.to) ? 'coin_in' : 'coin_out');
        if (ev.reason === 'toll' && ev.amount >= 400) set({ shake: get().shake + 1 });
        await sleep(ev.reason === 'toll' ? 750 : 480);
        return;
      }
      case 'buy': {
        patchView((v) => {
          const tiles = v.tiles.slice();
          tiles[ev.tile] = { owner: ev.playerId, level: ev.level };
          return { tiles };
        });
        sfx.play('buy');
        pushFx({ kind: 'buy', tile: ev.tile, playerId: ev.playerId, tone: 'good' });
        await sleep(650);
        return;
      }
      case 'build': {
        patchView((v) => {
          const tiles = v.tiles.slice();
          tiles[ev.tile] = { ...tiles[ev.tile], level: ev.to };
          return { tiles };
        });
        const landmark = ev.to === 4 && ev.from < 4;
        sfx.play(landmark ? 'landmark' : ev.to < ev.from ? 'error' : 'build');
        pushFx({
          kind: landmark ? 'landmark' : 'build',
          tile: ev.tile,
          playerId: ev.playerId,
          tone: ev.to < ev.from ? 'bad' : 'good',
        });
        if (landmark) set({ shake: get().shake + 1 });
        await sleep(landmark ? 1300 : 650);
        return;
      }
      case 'acquire': {
        patchView((v) => {
          const tiles = v.tiles.slice();
          tiles[ev.tile] = { ...tiles[ev.tile], owner: ev.playerId };
          return { tiles };
        });
        sfx.play('acquire');
        pushFx({ kind: 'acquire', tile: ev.tile, playerId: ev.playerId, text: 'DIAKUISISI!', tone: 'info' });
        set({ shake: get().shake + 1 });
        await sleep(1000);
        return;
      }
      case 'sell': {
        patchView((v) => {
          const tiles = v.tiles.slice();
          ev.tiles.forEach((t) => (tiles[t] = { owner: null, level: 0 }));
          const festivalTile = v.festivalTile !== null && ev.tiles.includes(v.festivalTile) ? null : v.festivalTile;
          return { tiles, festivalTile };
        });
        sfx.play('coin_out');
        await sleep(550);
        return;
      }
      case 'force_sale': {
        patchView((v) => {
          const tiles = v.tiles.slice();
          tiles[ev.tile] = { owner: null, level: 0 };
          return { tiles, festivalTile: v.festivalTile === ev.tile ? null : v.festivalTile };
        });
        sfx.play('bankrupt');
        pushFx({ kind: 'text', tile: ev.tile, text: 'DIGUSUR! 🚜', tone: 'bad' });
        await sleep(900);
        return;
      }
      case 'festival': {
        patchView(() => ({ festivalTile: ev.tile }));
        if (ev.tile !== null) {
          sfx.play('festival');
          pushFx({ kind: 'festival', tile: ev.tile, playerId: ev.playerId, text: 'PESTA! ×2', tone: 'good' }, 2200);
          await sleep(1100);
        }
        return;
      }
      case 'card': {
        sfx.play('card');
        await sleep(300);
        return;
      }
      case 'card_used': {
        const label = ev.card === 'shield' ? '🛡️ Asuransi dipakai!' : ev.card === 'escape' ? '🛟 Bebas!' : '🏷️ Diskon 50%!';
        pushFx({ kind: 'shield', playerId: ev.playerId, text: label, tone: 'good' });
        sfx.play('whoosh');
        await sleep(800);
        return;
      }
      case 'island': {
        patchView((v) => ({ islandTurns: { ...v.islandTurns, [ev.playerId]: ev.turnsLeft } }));
        sfx.play(ev.escaped ? 'whoosh' : 'island');
        pushFx({
          kind: 'text',
          playerId: ev.playerId,
          text: ev.escaped ? 'Berhasil kabur! 🚤' : `Terdampar ${ev.turnsLeft} giliran 🏝️`,
          tone: ev.escaped ? 'good' : 'bad',
        });
        await sleep(800);
        return;
      }
      case 'bankrupt': {
        patchView((v) => {
          const tiles = v.tiles.map((t) => (t.owner === ev.playerId ? { owner: null, level: 0 } : t));
          const ft = v.festivalTile;
          const festivalTile = ft !== null && v.tiles[ft]?.owner === ev.playerId ? null : ft;
          return { tiles, festivalTile, bankrupt: { ...v.bankrupt, [ev.playerId]: true } };
        });
        sfx.play('bankrupt');
        haptic([40, 60, 80]);
        pushFx({ kind: 'bankrupt', playerId: ev.playerId, text: 'BANGKRUT!', tone: 'bad' }, 2600);
        set({ shake: get().shake + 1 });
        await sleep(1600);
        return;
      }
      case 'monopoly_alert': {
        set({ alert: { playerId: ev.playerId, reason: ev.reason, missing: ev.missing } });
        sfx.play('alert');
        const g = gen;
        setTimeout(() => {
          if (g === generation) set({ alert: null });
        }, 4200);
        await sleep(1400);
        return;
      }
      case 'game_over': {
        sfx.play('win');
        await sleep(700);
        return;
      }
      case 'message': {
        pushFx({ kind: 'text', text: ev.text, tone: ev.tone });
        await sleep(900);
        return;
      }
    }
  }

  async function runQueue() {
    if (running) return;
    running = true;
    const gen = generation;
    set({ busy: true });
    try {
      while (gen === generation) {
        const q = get().queue;
        if (q.length === 0) break;
        const [ev, ...rest] = q;
        set({ queue: rest, currentEvent: ev });
        await playEvent(ev, gen);
      }
    } finally {
      running = false;
    }
    if (gen !== generation) return;
    const game = get().game;
    set({ currentEvent: null, busy: false, view: game ? { ...viewFromState(game), dice: get().view?.dice ?? null } : null });
    saveGame(game);
    afterIdle();
  }

  function afterIdle() {
    const { game, paused, busy } = get();
    if (!game || busy) return;
    const gen = generation;
    if (game.winner) {
      music.play('victory');
      setTimeout(() => gen === generation && set({ screen: 'results' }), 1800);
      return;
    }
    if (paused) return;
    const pending = game.pending;
    const player = game.players[game.current];
    if (pending.kind === 'end_turn') {
      setTimeout(() => {
        if (gen === generation && !get().paused && !get().busy) dispatch({ type: 'END_TURN' }, 'auto');
      }, 320 * speedFactor());
      return;
    }
    if (player?.isBot) {
      const think = pending.kind === 'roll' || pending.kind === 'island' ? 650 : 900;
      setTimeout(() => {
        if (gen !== generation || get().paused || get().busy) return;
        const g = get().game;
        if (!g || g.winner) return;
        let action: Action;
        try {
          action = decideBotAction(g);
        } catch (e) {
          console.error('[bot] decide failed', e);
          action = listLegalActions(g)[0] ?? { type: 'END_TURN' };
        }
        dispatch(action, 'bot');
      }, think * speedFactor());
    }
  }

  function dispatch(action: Action, by: 'human' | 'bot' | 'auto') {
    const game = get().game;
    if (!game || game.winner) return;
    let result;
    try {
      result = applyAction(game, action);
      botFailures = 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[engine] illegal ${by} action`, action, msg);
      if (by === 'human') {
        sfx.play('error');
        set({ error: msg });
        return;
      }
      // Bots/auto: fall back to the first legal action to avoid a stuck game.
      botFailures++;
      const fallback = listLegalActions(game).find((a) => a.type !== action.type) ?? listLegalActions(game)[0];
      if (fallback && botFailures < 5) {
        try {
          result = applyAction(game, fallback);
        } catch (e2) {
          console.error('[engine] fallback failed', e2);
          return;
        }
      } else {
        set({ error: msg });
        return;
      }
    }
    set({ game: result.state, queue: [...get().queue, ...result.events] });
    if (result.events.length === 0) {
      saveGame(result.state);
      afterIdle();
    } else {
      void runQueue();
    }
  }

  return {
    screen: 'menu',
    game: null,
    view: null,
    queue: [],
    currentEvent: null,
    busy: false,
    fx: [],
    alert: null,
    paused: false,
    error: null,
    shake: 0,

    setScreen: (screen) => set({ screen }),

    startGame: (config) => {
      generation++;
      running = false;
      const seed = config.seed ?? Math.floor(Math.random() * 2 ** 31);
      const game = createGame({ ...config, seed });
      const first = game.players[game.current];
      set({
        game,
        view: viewFromState(game),
        queue: [{ type: 'turn_start', playerId: first.id, round: game.round }],
        currentEvent: null,
        busy: false,
        fx: [],
        alert: null,
        paused: false,
        error: null,
        screen: 'game',
      });
      music.play('game');
      saveGame(game);
      void runQueue();
    },

    restartSame: () => {
      const g = get().game;
      if (!g) return;
      get().startGame({ ...g.config, seed: undefined });
    },

    continueGame: () => {
      const game = loadGame();
      if (!game) return false;
      generation++;
      running = false;
      set({
        game,
        view: viewFromState(game),
        queue: [],
        currentEvent: null,
        busy: false,
        fx: [],
        alert: null,
        paused: false,
        error: null,
        screen: 'game',
      });
      music.play('game');
      setTimeout(afterIdle, 400);
      return true;
    },

    hasSave: () => loadGame() !== null,

    act: (action) => {
      const { game, busy, paused } = get();
      if (!game || busy || paused || game.winner) return;
      const p = game.players[game.current];
      if (p.isBot) return;
      sfx.play('click');
      dispatch(action, 'human');
    },

    setPaused: (paused) => {
      set({ paused });
      if (!paused) afterIdle();
    },

    quitToMenu: () => {
      generation++;
      running = false;
      saveGame(get().game);
      set({ screen: 'menu', game: null, view: null, queue: [], currentEvent: null, busy: false, fx: [], alert: null, paused: false });
      music.play('menu');
    },

    clearError: () => set({ error: null }),
  };
});

// ───────────── convenience selectors ─────────────

/** The pending decision if it is a human's turn and nothing is animating — otherwise null. */
export function useHumanPending() {
  return useGame((s) => {
    const g = s.game;
    if (!g || s.busy || s.paused || g.winner) return null;
    const p = g.players[g.current];
    if (!p || p.isBot) return null;
    return g.pending;
  });
}

/** Tiles the human may click right now (choose_tile pending). Empty array otherwise. */
export function useSelectableTiles(): number[] {
  const pending = useHumanPending();
  if (pending && pending.kind === 'choose_tile') return pending.candidates;
  return EMPTY;
}
const EMPTY: number[] = [];
