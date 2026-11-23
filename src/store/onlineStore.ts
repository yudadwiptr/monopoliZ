/**
 * Peer-to-Peer Online Multiplayer Store (WebRTC via PeerJS — 100% serverless).
 *
 * - Host creates a 5-character room code (Peer ID `monopoliz-rm-<CODE>`).
 * - Guests join by entering the 5-character code (or opening `?room=<CODE>`).
 * - When Host starts the match, Host generates a deterministic `GameConfig` (with `seed`)
 *   and sends `START_MATCH` to all guests.
 * - During gameplay, every local human action (and Host-driven bot action) is broadcast via
 *   `REMOTE_ACTION` so all phones replay the exact same deterministic engine events in real time.
 */
import Peer, { type DataConnection } from 'peerjs';
import { create } from 'zustand';
import { CHARACTERS } from '@/data/characters';
import { DEFAULT_MAX_ROUNDS, DEFAULT_SALARY, DEFAULT_START_CASH } from '@/engine/economy';
import type { Action, BotLevel, GameConfig, PlayerSetup } from '@/engine/types';
import { sfx } from '@/audio';
import { setOutboundActionListener, useGame } from './gameStore';

const PEER_PREFIX = 'monopoliz-rm-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(len = 5): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export interface LobbyMember {
  peerId: string;
  name: string;
  characterId: string;
  isHost: boolean;
}

export interface LobbySnapshot {
  roomCode: string;
  mapId: string;
  startCash: number;
  maxRounds: number | null;
  fillBots: boolean;
  botLevel: BotLevel;
  totalSeats: number;
  members: LobbyMember[];
}

type WireMessage =
  | { type: 'JOIN_REQ'; name: string; characterId: string }
  | { type: 'JOIN_REJECT'; reason: string }
  | { type: 'UPDATE_MEMBER'; name: string; characterId: string }
  | { type: 'LOBBY_STATE'; lobby: LobbySnapshot }
  | { type: 'START_MATCH'; config: GameConfig; peerToPlayerId: Record<string, string> }
  | { type: 'REMOTE_ACTION'; action: Action };

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface OnlineStore {
  status: ConnectionStatus;
  role: 'offline' | 'host' | 'guest';
  myPeerId: string;
  myName: string;
  myChar: string;
  roomCode: string;
  error: string | null;
  lobby: LobbySnapshot | null;

  setMyProfile(name: string, characterId: string): void;
  createRoom(): void;
  joinRoom(code: string): void;
  updateRoomConfig(patch: Partial<Pick<LobbySnapshot, 'mapId' | 'startCash' | 'maxRounds' | 'fillBots' | 'botLevel' | 'totalSeats'>>): void;
  startMatch(): void;
  leaveRoom(): void;
}

let activePeer: Peer | null = null;
let hostConn: DataConnection | null = null;
const guestConns = new Map<string, DataConnection>();

const BOT_NAMES = ['Bli Investor', 'Kang Cuan', 'Cak Borong', 'Mbak Sultan'];

function pickFreeChar(taken: Set<string>, preferred: string): string {
  if (!taken.has(preferred)) return preferred;
  const found = CHARACTERS.find((c) => !taken.has(c.id));
  return found ? found.id : CHARACTERS[0].id;
}

function broadcastFromHost(msg: WireMessage, excludePeerId?: string) {
  guestConns.forEach((conn, pid) => {
    if (pid !== excludePeerId && conn.open) {
      conn.send(msg);
    }
  });
}

function cleanupPeer() {
  guestConns.forEach((c) => {
    try {
      c.close();
    } catch {
      /* ignore */
    }
  });
  guestConns.clear();
  if (hostConn) {
    try {
      hostConn.close();
    } catch {
      /* ignore */
    }
    hostConn = null;
  }
  if (activePeer) {
    try {
      activePeer.destroy();
    } catch {
      /* ignore */
    }
    activePeer = null;
  }
}

export const useOnline = create<OnlineStore>()((set, get) => {
  // Hook into gameStore so local actions during an online match are sent over WebRTC
  setOutboundActionListener((action) => {
    const { role } = get();
    if (role === 'host') {
      broadcastFromHost({ type: 'REMOTE_ACTION', action });
    } else if (role === 'guest' && hostConn?.open) {
      hostConn.send({ type: 'REMOTE_ACTION', action } satisfies WireMessage);
    }
  });

  const syncLobbyToGuests = () => {
    const { lobby } = get();
    if (!lobby) return;
    broadcastFromHost({ type: 'LOBBY_STATE', lobby });
  };

  return {
    status: 'idle',
    role: 'offline',
    myPeerId: '',
    myName: 'Sultan Muda',
    myChar: CHARACTERS[0].id,
    roomCode: '',
    error: null,
    lobby: null,

    setMyProfile: (name, characterId) => {
      set({ myName: name, myChar: characterId });
      const { role, lobby, myPeerId } = get();
      if (role === 'host' && lobby) {
        const takenByOthers = new Set(lobby.members.filter((m) => m.peerId !== myPeerId).map((m) => m.characterId));
        const safeChar = pickFreeChar(takenByOthers, characterId);
        const members = lobby.members.map((m) =>
          m.peerId === myPeerId ? { ...m, name: name.trim() || 'Host', characterId: safeChar } : m,
        );
        set({ myChar: safeChar, lobby: { ...lobby, members } });
        syncLobbyToGuests();
      } else if (role === 'guest' && hostConn?.open) {
        hostConn.send({
          type: 'UPDATE_MEMBER',
          name: name.trim() || 'Pemain',
          characterId,
        } satisfies WireMessage);
      }
    },

    createRoom: () => {
      cleanupPeer();
      const code = generateRoomCode(5);
      const peerId = `${PEER_PREFIX}${code}`;
      set({ status: 'connecting', role: 'host', roomCode: code, error: null });

      const peer = new Peer(peerId);
      activePeer = peer;

      peer.on('open', (id) => {
        const { myName, myChar } = get();
        const initialLobby: LobbySnapshot = {
          roomCode: code,
          mapId: 'nusantara',
          startCash: DEFAULT_START_CASH,
          maxRounds: DEFAULT_MAX_ROUNDS,
          fillBots: true,
          botLevel: 'sedang',
          totalSeats: 4,
          members: [
            {
              peerId: id,
              name: myName.trim() || 'Host Sultan',
              characterId: myChar,
              isHost: true,
            },
          ],
        };
        set({ status: 'connected', myPeerId: id, lobby: initialLobby });
        sfx.play('coin_in');
      });

      peer.on('connection', (conn) => {
        conn.on('data', (raw) => {
          const msg = raw as WireMessage;
          const curLobby = get().lobby;
          if (!curLobby) return;

          if (msg.type === 'JOIN_REQ') {
            if (curLobby.members.length >= 4) {
              conn.send({ type: 'JOIN_REJECT', reason: 'Room sudah penuh (maks 4 pemain)' } satisfies WireMessage);
              return;
            }
            guestConns.set(conn.peer, conn);
            const taken = new Set(curLobby.members.map((m) => m.characterId));
            const assignedChar = pickFreeChar(taken, msg.characterId);
            const nextMembers: LobbyMember[] = [
              ...curLobby.members.filter((m) => m.peerId !== conn.peer),
              {
                peerId: conn.peer,
                name: (msg.name || '').trim() || `Pemain ${curLobby.members.length + 1}`,
                characterId: assignedChar,
                isHost: false,
              },
            ];
            const nextTotal = Math.max(curLobby.totalSeats, nextMembers.length);
            const nextLobby = { ...curLobby, members: nextMembers, totalSeats: nextTotal };
            set({ lobby: nextLobby });
            sfx.play('click');
            syncLobbyToGuests();
          } else if (msg.type === 'UPDATE_MEMBER') {
            const takenByOthers = new Set(
              curLobby.members.filter((m) => m.peerId !== conn.peer).map((m) => m.characterId),
            );
            const safeChar = pickFreeChar(takenByOthers, msg.characterId);
            const nextMembers = curLobby.members.map((m) =>
              m.peerId === conn.peer
                ? { ...m, name: (msg.name || '').trim() || m.name, characterId: safeChar }
                : m,
            );
            set({ lobby: { ...curLobby, members: nextMembers } });
            syncLobbyToGuests();
          } else if (msg.type === 'REMOTE_ACTION') {
            useGame.getState().receiveRemoteAction(msg.action);
            broadcastFromHost({ type: 'REMOTE_ACTION', action: msg.action }, conn.peer);
          }
        });

        conn.on('close', () => {
          guestConns.delete(conn.peer);
          const curLobby = get().lobby;
          if (!curLobby) return;
          const nextMembers = curLobby.members.filter((m) => m.peerId !== conn.peer);
          set({ lobby: { ...curLobby, members: nextMembers } });
          syncLobbyToGuests();
        });
      });

      peer.on('error', (err) => {
        console.warn('[online host error]', err);
        set({ status: 'error', error: 'Gagal membuat room online. Coba lagi.' });
      });
    },

    joinRoom: (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      if (code.length < 4) {
        set({ error: 'Masukkan kode room yang valid (5 karakter)' });
        return;
      }
      cleanupPeer();
      set({ status: 'connecting', role: 'guest', roomCode: code, error: null });

      const peer = new Peer();
      activePeer = peer;

      peer.on('open', (id) => {
        set({ myPeerId: id });
        const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
        hostConn = conn;

        conn.on('open', () => {
          const { myName, myChar } = get();
          conn.send({
            type: 'JOIN_REQ',
            name: myName.trim() || 'Tamu Sultan',
            characterId: myChar,
          } satisfies WireMessage);
        });

        conn.on('data', (raw) => {
          const msg = raw as WireMessage;
          if (msg.type === 'JOIN_REJECT') {
            set({ status: 'error', error: msg.reason });
            cleanupPeer();
          } else if (msg.type === 'LOBBY_STATE') {
            const me = msg.lobby.members.find((m) => m.peerId === get().myPeerId);
            set({
              status: 'connected',
              lobby: msg.lobby,
              ...(me ? { myChar: me.characterId, myName: me.name } : {}),
            });
          } else if (msg.type === 'START_MATCH') {
            const myPlayerId = msg.peerToPlayerId[get().myPeerId] ?? 'p2';
            useGame.getState().startOnlineGame(msg.config, myPlayerId, 'guest');
          } else if (msg.type === 'REMOTE_ACTION') {
            useGame.getState().receiveRemoteAction(msg.action);
          }
        });

        conn.on('close', () => {
          if (useGame.getState().screen === 'online') {
            set({ status: 'error', error: 'Koneksi ke Host terputus.', lobby: null });
          }
        });

        conn.on('error', () => {
          set({ status: 'error', error: 'Gagal terhubung ke Room tersebut.' });
        });
      });

      peer.on('error', (err) => {
        console.warn('[online guest error]', err);
        set({
          status: 'error',
          error: 'Room tidak ditemukan atau kode salah. Pastikan Host masih membuka room.',
        });
      });
    },

    updateRoomConfig: (patch) => {
      const { role, lobby } = get();
      if (role !== 'host' || !lobby) return;
      const next = { ...lobby, ...patch };
      next.totalSeats = Math.max(next.members.length, Math.min(4, Math.max(2, next.totalSeats)));
      set({ lobby: next });
      syncLobbyToGuests();
    },

    startMatch: () => {
      const { role, lobby, myPeerId } = get();
      if (role !== 'host' || !lobby) return;

      const players: PlayerSetup[] = [];
      const peerToPlayerId: Record<string, string> = {};
      const takenChars = new Set<string>();

      lobby.members.forEach((m, idx) => {
        const pid = `p${idx + 1}`;
        peerToPlayerId[m.peerId] = pid;
        const ch = pickFreeChar(takenChars, m.characterId);
        takenChars.add(ch);
        players.push({
          name: m.name,
          characterId: ch,
          isBot: false,
          botLevel: lobby.botLevel,
        });
      });

      const targetCount = lobby.fillBots
        ? Math.max(2, Math.min(4, Math.max(lobby.totalSeats, players.length)))
        : Math.max(2, players.length);

      while (players.length < targetCount) {
        const idx = players.length;
        const ch = pickFreeChar(takenChars, CHARACTERS[idx % CHARACTERS.length].id);
        takenChars.add(ch);
        players.push({
          name: BOT_NAMES[idx % BOT_NAMES.length],
          characterId: ch,
          isBot: true,
          botLevel: lobby.botLevel,
        });
      }

      const config: GameConfig = {
        mapId: lobby.mapId,
        players,
        startCash: lobby.startCash,
        salary: DEFAULT_SALARY,
        maxRounds: lobby.maxRounds,
        seed: Math.floor(Math.random() * 2 ** 31),
      };

      broadcastFromHost({ type: 'START_MATCH', config, peerToPlayerId });
      const hostPlayerId = peerToPlayerId[myPeerId] ?? 'p1';
      useGame.getState().startOnlineGame(config, hostPlayerId, 'host');
    },

    leaveRoom: () => {
      cleanupPeer();
      set({
        status: 'idle',
        role: 'offline',
        roomCode: '',
        error: null,
        lobby: null,
      });
    },
  };
});
