/**
 * Setup-screen draft model: defaults, pure update helpers, localStorage persistence and
 * conversion to the engine's GameConfig.
 */
import { BOT_NAMES, CHARACTERS, getCharacter } from '@/data/characters';
import { MAPS } from '@/data/maps';
import { DEFAULT_MAX_ROUNDS, DEFAULT_SALARY, DEFAULT_START_CASH } from '@/engine/economy';
import type { BotLevel, GameConfig } from '@/engine/types';

export const SETUP_KEY = 'monopoliz.setup.v1';
export const MIN_SEATS = 2;
export const MAX_SEATS = 4;
export const START_CASH_OPTIONS = [1500, 2000, 3000] as const;
export const ROUND_OPTIONS: (number | null)[] = [15, 25, 40, null];
export const NAME_MAX = 14;
const BOT_LEVELS: BotLevel[] = ['mudah', 'sedang', 'sulit'];

export interface SeatDraft {
  uid: string;
  characterId: string;
  isBot: boolean;
  botLevel: BotLevel;
  name: string;
  /** true while the name is the auto default (follows character / bot toggle) */
  autoName: boolean;
}

export interface SetupDraft {
  mapId: string;
  seats: SeatDraft[];
  startCash: number;
  maxRounds: number | null;
}

let uidSeq = 0;
const newUid = () => `seat-${Date.now().toString(36)}-${(uidSeq++).toString(36)}`;

export function pickBotName(exclude: string[] = []): string {
  const pool = BOT_NAMES.filter((n) => !exclude.includes(n));
  const list = pool.length ? pool : BOT_NAMES;
  return list[Math.floor(Math.random() * list.length)];
}

function pickBotNames(count: number, exclude: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pickBotName([...exclude, ...out]));
  return out;
}

export function defaultHumanName(characterId: string): string {
  return getCharacter(characterId).name;
}

/** Placeholder shown while the name input is empty. */
export function placeholderName(seat: SeatDraft): string {
  return seat.isBot ? 'Nama bot' : defaultHumanName(seat.characterId);
}

export function makeSeat(characterId: string, isBot: boolean, usedNames: string[] = []): SeatDraft {
  return {
    uid: newUid(),
    characterId,
    isBot,
    botLevel: 'sedang',
    name: isBot ? pickBotName(usedNames) : defaultHumanName(characterId),
    autoName: true,
  };
}

export function defaultSetup(): SetupDraft {
  const bots = pickBotNames(2);
  return {
    mapId: 'nusantara',
    seats: [
      makeSeat(CHARACTERS[0].id, false),
      { ...makeSeat(CHARACTERS[1].id, true), name: bots[0] },
      { ...makeSeat(CHARACTERS[2].id, true), name: bots[1] },
    ],
    startCash: DEFAULT_START_CASH,
    maxRounds: DEFAULT_MAX_ROUNDS,
  };
}

// ───────────────────────── pure updates ─────────────────────────

const names = (d: SetupDraft, exceptUid?: string) => d.seats.filter((s) => s.uid !== exceptUid).map((s) => s.name);

function patchSeat(d: SetupDraft, uid: string, fn: (s: SeatDraft) => SeatDraft): SetupDraft {
  return { ...d, seats: d.seats.map((s) => (s.uid === uid ? fn(s) : s)) };
}

export function setSeatCharacter(d: SetupDraft, uid: string, characterId: string): SetupDraft {
  if (d.seats.some((s) => s.uid !== uid && s.characterId === characterId)) return d;
  return patchSeat(d, uid, (s) => ({
    ...s,
    characterId,
    name: s.autoName && !s.isBot ? defaultHumanName(characterId) : s.name,
  }));
}

export function setSeatBot(d: SetupDraft, uid: string, isBot: boolean): SetupDraft {
  const others = names(d, uid);
  return patchSeat(d, uid, (s) => {
    if (s.isBot === isBot) return s;
    const auto = s.autoName || s.name.trim() === '';
    return {
      ...s,
      isBot,
      autoName: auto,
      name: auto ? (isBot ? pickBotName(others) : defaultHumanName(s.characterId)) : s.name,
    };
  });
}

export function setSeatName(d: SetupDraft, uid: string, name: string): SetupDraft {
  const clean = name.slice(0, NAME_MAX);
  return patchSeat(d, uid, (s) => ({ ...s, name: clean, autoName: clean.trim() === '' }));
}

export function shuffleBotName(d: SetupDraft, uid: string): SetupDraft {
  const others = names(d);
  return patchSeat(d, uid, (s) => ({ ...s, name: pickBotName(others), autoName: true }));
}

export function setSeatLevel(d: SetupDraft, uid: string, botLevel: BotLevel): SetupDraft {
  return patchSeat(d, uid, (s) => ({ ...s, botLevel }));
}

export function addSeat(d: SetupDraft): SetupDraft {
  if (d.seats.length >= MAX_SEATS) return d;
  const taken = new Set(d.seats.map((s) => s.characterId));
  const free = CHARACTERS.find((c) => !taken.has(c.id));
  if (!free) return d;
  return { ...d, seats: [...d.seats, makeSeat(free.id, true, names(d))] };
}

export function removeSeat(d: SetupDraft, uid: string): SetupDraft {
  if (d.seats.length <= MIN_SEATS) return d;
  return { ...d, seats: d.seats.filter((s) => s.uid !== uid) };
}

// ───────────────────────── persistence ─────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function sanitize(raw: unknown): SetupDraft | null {
  if (!isRecord(raw)) return null;
  const map = MAPS.find((m) => m.id === raw.mapId && !m.locked);
  const startCash = (START_CASH_OPTIONS as readonly number[]).includes(Number(raw.startCash))
    ? Number(raw.startCash)
    : DEFAULT_START_CASH;
  const maxRounds = ROUND_OPTIONS.includes(raw.maxRounds as number | null)
    ? (raw.maxRounds as number | null)
    : DEFAULT_MAX_ROUNDS;
  if (!Array.isArray(raw.seats)) return null;
  const used = new Set<string>();
  const seats: SeatDraft[] = [];
  for (const s of raw.seats) {
    if (!isRecord(s) || seats.length >= MAX_SEATS) continue;
    const char = CHARACTERS.find((c) => c.id === s.characterId);
    if (!char || used.has(char.id)) continue;
    used.add(char.id);
    const isBot = s.isBot === true;
    const name = typeof s.name === 'string' ? s.name.slice(0, NAME_MAX) : '';
    seats.push({
      uid: newUid(),
      characterId: char.id,
      isBot,
      botLevel: BOT_LEVELS.includes(s.botLevel as BotLevel) ? (s.botLevel as BotLevel) : 'sedang',
      name: name || (isBot ? pickBotName() : char.name),
      autoName: s.autoName === true || !name,
    });
  }
  if (seats.length < MIN_SEATS) return null;
  return { mapId: map?.id ?? 'nusantara', seats, startCash, maxRounds };
}

export function loadSetup(): SetupDraft {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (raw) return sanitize(JSON.parse(raw)) ?? defaultSetup();
  } catch {
    /* storage unavailable or corrupt */
  }
  return defaultSetup();
}

export function saveSetup(d: SetupDraft): void {
  try {
    const { mapId, startCash, maxRounds } = d;
    const seats = d.seats.map(({ characterId, isBot, botLevel, name, autoName }) => ({
      characterId,
      isBot,
      botLevel,
      name,
      autoName,
    }));
    localStorage.setItem(SETUP_KEY, JSON.stringify({ mapId, startCash, maxRounds, seats }));
  } catch {
    /* ignore */
  }
}

// ───────────────────────── config ─────────────────────────

export function humanCount(d: SetupDraft): number {
  return d.seats.filter((s) => !s.isBot).length;
}

export function toConfig(d: SetupDraft): GameConfig {
  const used = d.seats.map((s) => s.name.trim()).filter(Boolean);
  return {
    mapId: d.mapId,
    players: d.seats.map((s) => {
      let name = s.name.trim();
      if (!name) {
        name = s.isBot ? pickBotName(used) : defaultHumanName(s.characterId);
        used.push(name);
      }
      return { name, characterId: s.characterId, isBot: s.isBot, botLevel: s.botLevel };
    }),
    startCash: d.startCash,
    salary: DEFAULT_SALARY,
    maxRounds: d.maxRounds,
  };
}

/** "Main Cepat vs Bot": you + 3 medium bots on Nusantara with default rules. */
export function quickPlayConfig(): GameConfig {
  const bots = pickBotNames(3);
  return {
    mapId: 'nusantara',
    players: [
      { name: 'Kamu', characterId: CHARACTERS[0].id, isBot: false, botLevel: 'sedang' },
      ...bots.map((name, i) => ({
        name,
        characterId: CHARACTERS[i + 1].id,
        isBot: true,
        botLevel: 'sedang' as const,
      })),
    ],
    startCash: DEFAULT_START_CASH,
    salary: DEFAULT_SALARY,
    maxRounds: DEFAULT_MAX_ROUNDS,
  };
}
