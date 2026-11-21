/**
 * MonopoliZ — core game contract.
 *
 * This file is the single source of truth shared by the engine, the AI, the store and the UI.
 * Contract fields MUST NOT be renamed or removed. The engine may ADD optional internal fields
 * (prefix them with `_`) if it needs bookkeeping.
 *
 * Money unit: integer "juta rupiah" (1 = Rp 1.000.000). Format with `formatRp` from `@/lib/format`.
 */

// ───────────────────────────── Map definitions (static data) ─────────────────────────────

export type TileKind =
  | 'start' // corner 0 — salary when passing; landing exactly lets you upgrade one of your cities
  | 'island' // corner 8 — stuck up to 3 turns (escape with doubles, fee or card)
  | 'festival' // corner 16 — host a festival on one of your properties (toll ×2)
  | 'airport' // corner 24 — next turn you may fly to any tile
  | 'city' // buildable property (land → rumah → ruko → hotel → landmark)
  | 'tourist' // destinasi wisata — buyable, not buildable, toll scales with how many you own
  | 'chance' // Kartu Rezeki
  | 'tax'; // Pajak — pay TAX_RATE of your total property value

export interface TileDef {
  index: number; // 0..31
  kind: TileKind;
  name: string; // "Medan"
  subtitle?: string; // "Sumatera Utara"
  group?: number; // city colour group id (0..7) — only for kind 'city'
  price?: number; // land price for 'city', purchase price for 'tourist' (juta)
  icon: string; // emoji used for tile illustration
  blurb?: string; // fun fact / flavour text shown in tile details
}

export interface MapGroup {
  id: number;
  name: string; // "Serambi Sumatera"
  color: string; // hex
}

export interface MapTheme {
  /** CSS background for the whole game screen */
  background: string;
  /** Board surface colour (center + tile base) */
  boardSurface: string;
  /** Accent colour for highlights */
  accent: string;
  /** Big emoji / motif shown in board center */
  emblem: string;
}

export interface MapDef {
  id: string;
  name: string; // "Nusantara"
  tagline: string;
  description: string;
  theme: MapTheme;
  groups: MapGroup[]; // 8 groups
  tiles: TileDef[]; // exactly 32 tiles, tiles[i].index === i
  locked?: boolean; // "Segera hadir" maps are listed but not playable
}

// ───────────────────────────── Characters ─────────────────────────────

export interface CharacterDef {
  id: string;
  name: string;
  emoji: string;
  color: string; // signature colour (also used as the player's colour)
  tagline: string;
}

// ───────────────────────────── Cards (Kartu Rezeki) ─────────────────────────────

export type KeepCard = 'escape' | 'shield' | 'discount';

export type CardMoveTarget = 'start' | 'island' | 'festival' | 'airport' | 'nearest_tourist';

export type CardEffect =
  | { type: 'gain'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'pay_percent_cash'; percent: number } // lose X% of current cash (rounded)
  | { type: 'collect_each'; amount: number } // every other active player pays you (capped at their cash)
  | { type: 'pay_each'; amount: number } // you pay every other active player
  | { type: 'move_to'; target: CardMoveTarget } // walks forward to the target (passing start pays salary), except 'island' which jumps
  | { type: 'move_by'; steps: number } // negative = backwards (no salary when going backwards)
  | { type: 'keep'; card: KeepCard }
  | { type: 'upgrade_free' } // choose one of your cities (not landmark) → +1 level for free
  | { type: 'downgrade_own' } // your highest-level non-landmark building drops 1 level (engine picks)
  | { type: 'pay_per_building'; amount: number } // pay amount × total building levels you own
  | { type: 'festival_move' } // choose one of your properties to host the festival
  | { type: 'force_sale' }; // choose an opponent's non-landmark property → returned to bank, owner refunded SELL_RATIO

export interface CardDef {
  id: string;
  title: string;
  text: string;
  emoji: string;
  tone: 'good' | 'bad' | 'neutral';
  effect: CardEffect;
  copies: number; // how many copies are in the deck
}

// ───────────────────────────── Runtime state ─────────────────────────────

export type BotLevel = 'mudah' | 'sedang' | 'sulit';

export interface PlayerSetup {
  name: string;
  characterId: string;
  isBot: boolean;
  botLevel: BotLevel;
}

export interface GameConfig {
  mapId: string;
  players: PlayerSetup[]; // 2..4
  startCash: number; // juta, default 2000 (Rp 2 M)
  salary: number; // juta, default 200
  maxRounds: number | null; // null = no limit
  seed?: number;
}

export interface PlayerState {
  id: string; // 'p1'..'p4'
  name: string;
  characterId: string;
  color: string;
  isBot: boolean;
  botLevel: BotLevel;
  cash: number;
  position: number; // 0..31
  laps: number; // times passed/landed on start (affects build cap)
  bankrupt: boolean;
  islandTurns: number; // >0 while stuck on the island (turns left)
  pendingFlight: boolean; // landed on airport → next turn may fly
  cards: KeepCard[];
  /** Genap/Ganjil picks left (see PARITY_CHARGES). Missing in old saves = full. */
  parityCharges?: number;
}

export interface TileState {
  owner: string | null; // player id
  level: number; // 0 land … 4 landmark (only meaningful when owned; tourist always 0)
}

export type WinReason =
  | 'bangkrut' // all opponents bankrupt
  | 'monopoli_wisata' // own every tourist tile
  | 'monopoli_jalur' // own every property on one side of the board
  | 'monopoli_warna' // own 3 complete colour groups
  | 'batas_ronde'; // round limit reached → richest wins

export type ChooseTilePurpose =
  | 'airport' // fly anywhere (optional → SKIP means roll normally)
  | 'festival' // landed on festival corner: host festival (optional)
  | 'start_upgrade' // landed exactly on start: upgrade one city one level, paying cost (optional)
  | 'card_upgrade' // card: free +1 level (optional)
  | 'card_festival' // card: move festival (optional)
  | 'force_sale'; // card: kick an opponent's property back to the bank (optional)

/**
 * What the game is waiting for. Always belongs to the CURRENT player.
 */
export type Pending =
  | { kind: 'roll' } // → ROLL
  | {
      kind: 'island';
      turnsLeft: number;
      fee: number;
      canPay: boolean;
      hasCard: boolean;
    } // → ROLL (try doubles) | PAY_ESCAPE | USE_ESCAPE_CARD
  | {
      kind: 'buy';
      tile: number;
      maxLevel: number; // highest level purchasable this visit (0 = land only)
      discount: boolean; // player holds a discount card that will be consumed
    } // → BUY{level} | SKIP
  | {
      kind: 'build';
      tile: number;
      fromLevel: number;
      maxLevel: number;
      discount: boolean;
    } // → BUILD{level} | SKIP
  | { kind: 'acquire'; tile: number; price: number; ownerId: string } // → ACQUIRE | SKIP
  | {
      kind: 'choose_tile';
      purpose: ChooseTilePurpose;
      candidates: number[];
      optional: boolean;
    } // → CHOOSE_TILE{tile} | SKIP (if optional)
  | { kind: 'card'; cardId: string } // → ACK (applies the card)
  | {
      kind: 'raise_funds';
      amount: number; // total still owed
      creditorId: string | null; // null = bank
      reason: TransferReason;
    } // → SELL{tiles} | BANKRUPT
  | { kind: 'end_turn'; extraRoll: boolean } // → END_TURN (UI/store dispatches automatically)
  | { kind: 'game_over' };

/** Genap/Ganjil pick on a roll: a non-matching result is re-rolled once (the second throw stands). */
export type Parity = 'genap' | 'ganjil';

export type Action =
  | { type: 'ROLL'; power?: number; parity?: Parity } // power 0..1 from the dice gauge; parity = Genap/Ganjil pick
  | { type: 'PAY_ESCAPE' }
  | { type: 'USE_ESCAPE_CARD' }
  | { type: 'BUY'; level: number }
  | { type: 'BUILD'; level: number }
  | { type: 'ACQUIRE' }
  | { type: 'CHOOSE_TILE'; tile: number }
  | { type: 'SKIP' }
  | { type: 'ACK' }
  | { type: 'SELL'; tiles: number[] }
  | { type: 'BANKRUPT' }
  | { type: 'END_TURN' };

export type TransferReason =
  | 'salary'
  | 'toll'
  | 'buy'
  | 'build'
  | 'acquire'
  | 'tax'
  | 'card'
  | 'island_fee'
  | 'sell'
  | 'force_sale'
  | 'bankrupt';

export interface LogEntry {
  id: number;
  round: number;
  playerId: string | null;
  text: string; // Bahasa Indonesia, human readable
  tone: 'good' | 'bad' | 'info';
}

export interface GameState {
  version: 1;
  id: string;
  mapId: string;
  config: GameConfig;
  players: PlayerState[];
  tiles: TileState[]; // length 32
  current: number; // index into players
  round: number; // starts at 1
  festivalTile: number | null;
  pending: Pending;
  lastDice: [number, number] | null;
  doublesInRow: number;
  deck: string[]; // remaining card ids (top = index 0)
  rng: number; // seeded RNG state (uint32)
  winner: { playerId: string; reason: WinReason } | null;
  log: LogEntry[]; // newest last, capped (~80)
  logSeq: number;
  turnCount: number;
}

// ───────────────────────────── Events (for animation) ─────────────────────────────
/**
 * `applyAction` returns the list of events that happened, in order. The store replays them
 * to animate the board. Rules for the view model:
 *  - cash changes ONLY through `transfer` events
 *  - ownership/levels change through buy/build/acquire/sell/force_sale/bankrupt events
 *  - positions change through `move` events
 */
export type GameEvent =
  | { type: 'turn_start'; playerId: string; round: number }
  | { type: 'dice'; playerId: string; dice: [number, number]; doubles: boolean }
  | {
      type: 'move';
      playerId: string;
      from: number;
      to: number;
      steps: number; // signed number of tiles walked (walk mode); 0 for fly/jump
      mode: 'walk' | 'fly' | 'jump';
    }
  | {
      type: 'transfer';
      from: string | null; // null = bank
      to: string | null; // null = bank
      amount: number;
      reason: TransferReason;
      tile?: number; // where it happened (for floating fx)
    }
  | { type: 'buy'; playerId: string; tile: number; level: number }
  | { type: 'build'; playerId: string; tile: number; from: number; to: number } // also used for downgrades (to < from)
  | { type: 'acquire'; playerId: string; fromId: string; tile: number }
  | { type: 'sell'; playerId: string; tiles: number[] }
  | { type: 'force_sale'; byId: string; ownerId: string; tile: number }
  | { type: 'festival'; playerId: string; tile: number | null }
  | { type: 'card'; playerId: string; cardId: string }
  | { type: 'card_used'; playerId: string; card: KeepCard }
  | { type: 'island'; playerId: string; turnsLeft: number; escaped: boolean }
  | { type: 'bankrupt'; playerId: string; creditorId: string | null }
  | { type: 'monopoly_alert'; playerId: string; reason: WinReason; missing: number[] }
  | { type: 'game_over'; winnerId: string; reason: WinReason }
  | { type: 'message'; text: string; tone: 'good' | 'bad' | 'info' };

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}
