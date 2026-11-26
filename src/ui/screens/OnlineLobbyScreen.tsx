import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Check,
  ChevronLeft,
  Copy,
  Globe,
  Loader2,
  LogIn,
  PlusCircle,
  Rocket,
  Share2,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CHARACTERS, getCharacter } from '@/data/characters';
import { MAPS } from '@/data/maps';
import { formatRp } from '@/lib/format';
import { useGame } from '@/store/gameStore';
import { useOnline } from '@/store/onlineStore';
import { Avatar, Button } from '@/ui/common';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { IconButton } from './parts/IconButton';

const CASH_OPTIONS = [1500, 2000, 3000] as const;
const ROUND_OPTIONS: (number | null)[] = [15, 25, 35, null];

export function OnlineLobbyScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const {
    status,
    role,
    myPeerId,
    myName,
    myChar,
    roomCode,
    error,
    lobby,
    setMyProfile,
    createRoom,
    joinRoom,
    updateRoomConfig,
    startMatch,
    leaveRoom,
  } = useOnline();

  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // Auto-fill room code if the URL has ?room=XXXXX
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rm = params.get('room');
      if (rm && rm.trim().length >= 4) {
        setJoinCode(rm.trim().toUpperCase());
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onBack = () => {
    if (status === 'connected' || status === 'connecting') {
      leaveRoom();
      return;
    }
    setScreen('menu');
  };

  const shareUrl =
    typeof window !== 'undefined' && roomCode
      ? `${window.location.origin}${window.location.pathname}?room=${roomCode}`
      : '';

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied('code');
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareInvite = async () => {
    if (!roomCode) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Mabar MonopoliZ!',
          text: `Yuk mabar MonopoliZ! Masukkan Kode Room: ${roomCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        /* fallback to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const inLobby = status === 'connected' && !!lobby;
  const isHost = role === 'host';
  const takenChars = new Set(
    (lobby?.members ?? []).filter((m) => m.peerId !== myPeerId).map((m) => m.characterId),
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop variant="calm" skyline={false} />

      <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] scrollbar-thin sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3"
          >
            <IconButton label={inLobby ? 'Keluar dari Room' : 'Kembali ke menu'} onClick={onBack}>
              <ChevronLeft size={24} />
            </IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-white sm:text-2xl">Mabar Online (Room Code)</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-daun-400/40 bg-daun-500/20 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-daun-300">
                  <Wifi size={11} /> P2P Live
                </span>
              </div>
              <p className="truncate text-xs text-ink-300">
                Main bareng teman beda HP pakai kode room 5 huruf — gratis tanpa ribet!
              </p>
            </div>
          </motion.header>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-merah-400/50 bg-merah-500/15 px-4 py-2.5 text-xs font-semibold text-merah-200"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {!inLobby ? (
            /* ───────────── STEP 1: Profile + Create or Join Room ───────────── */
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Left: Player Profile (Name + Character) */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl p-4"
              >
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-brand-200">
                  1. Profil Sultan Kamu
                </h2>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-ink-200">Nama panggilan</span>
                  <input
                    type="text"
                    maxLength={16}
                    value={myName}
                    onChange={(e) => setMyProfile(e.target.value, myChar)}
                    placeholder="Nama kamu..."
                    className="mt-1 w-full rounded-xl border border-white/15 bg-ink-950/70 px-3 py-2 font-display text-sm font-semibold text-white outline-none focus:border-brand-300"
                  />
                </label>

                <div className="mt-3">
                  <span className="text-xs font-semibold text-ink-200">Pilih karakter</span>
                  <div className="mt-1.5 grid grid-cols-4 gap-2">
                    {CHARACTERS.map((c) => {
                      const active = myChar === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setMyProfile(myName, c.id)}
                          className={clsx(
                            'flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all',
                            active
                              ? 'border-gold-300 bg-gold-400/20 shadow-glow-gold'
                              : 'border-white/10 bg-white/5 hover:bg-white/10',
                          )}
                        >
                          <Avatar characterId={c.id} size={36} active={active} />
                          <span className="font-display text-[11px] font-bold text-white">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>

              {/* Right: Create Room or Join Room */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="flex flex-col gap-3"
              >
                {/* Create Room Card */}
                <div className="glass flex flex-1 flex-col justify-between rounded-3xl p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <PlusCircle size={18} className="text-gold-300" />
                      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold-300">
                        Buat Room Baru (Host)
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-ink-300">
                      Bikin kode room 5 huruf, bagikan ke teman-temanmu, dan atur peta permainan.
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="lg"
                    block
                    className="mt-3"
                    disabled={status === 'connecting'}
                    icon={
                      status === 'connecting' && role === 'host' ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Sparkles size={20} />
                      )
                    }
                    onClick={createRoom}
                  >
                    {status === 'connecting' && role === 'host' ? 'Membuat Room...' : 'Buat Room Sekarang'}
                  </Button>
                </div>

                {/* Join Room Card */}
                <div className="glass flex flex-1 flex-col justify-between rounded-3xl p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <LogIn size={18} className="text-brand-300" />
                      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-brand-200">
                        Gabung Room Teman
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-ink-300">Masukkan 5 karakter Kode Room dari temanmu:</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="KODE..."
                      className="num w-32 rounded-xl border border-white/15 bg-ink-950/80 px-3 py-2 text-center font-display text-lg font-black uppercase tracking-widest text-gold-300 outline-none focus:border-brand-300"
                    />
                    <Button
                      variant="primary"
                      size="lg"
                      className="flex-1"
                      disabled={status === 'connecting' || joinCode.trim().length < 4}
                      icon={
                        status === 'connecting' && role === 'guest' ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Globe size={18} />
                        )
                      }
                      onClick={() => joinRoom(joinCode)}
                    >
                      {status === 'connecting' && role === 'guest' ? 'Menghubungkan...' : 'Gabung'}
                    </Button>
                  </div>
                </div>
              </motion.section>
            </div>
          ) : (
            /* ───────────── STEP 2: Active Waiting Room Lobby ───────────── */
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              {/* Room Code Banner + Share Buttons */}
              <div className="glass flex flex-col items-center justify-between gap-3 rounded-3xl border-gold-400/40 bg-gradient-to-r from-ink-900/90 via-brand-900/40 to-ink-900/90 p-4 sm:flex-row">
                <div className="text-center sm:text-left">
                  <span className="font-display text-[11px] font-bold uppercase tracking-widest text-ink-300">
                    Kode Room Mabar
                  </span>
                  <div className="mt-0.5 flex items-center justify-center gap-2 sm:justify-start">
                    <span className="num font-display text-3xl font-black tracking-[0.18em] text-gold-300 drop-shadow">
                      {lobby.roomCode}
                    </span>
                    <span className="rounded-full bg-daun-500/20 px-2.5 py-0.5 font-display text-[11px] font-bold text-daun-300">
                      {lobby.members.length}/4 Online
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="glass"
                    size="md"
                    icon={copied === 'code' ? <Check size={16} className="text-daun-300" /> : <Copy size={16} />}
                    onClick={() => void copyCode()}
                  >
                    {copied === 'code' ? 'Kode Tersalin!' : 'Salin Kode'}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={copied === 'link' ? <Check size={16} /> : <Share2 size={16} />}
                    onClick={() => void shareInvite()}
                  >
                    {copied === 'link' ? 'Link Tersalin!' : 'Undang Teman'}
                  </Button>
                </div>
              </div>

              {/* Players & Character Selection in Lobby */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Connected Seats */}
                <div className="glass rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                      Kursi Pemain ({lobby.members.length} Orang{lobby.fillBots ? ` + Bot` : ''})
                    </h2>
                    <Users size={16} className="text-brand-300" />
                  </div>

                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 4 }, (_, idx) => {
                      const member = lobby.members[idx];
                      if (member) {
                        const ch = getCharacter(member.characterId);
                        const isMe = member.peerId === myPeerId;
                        return (
                          <div
                            key={member.peerId}
                            className={clsx(
                              'flex items-center gap-2.5 rounded-2xl border px-3 py-2',
                              isMe ? 'border-brand-300/60 bg-brand-500/15' : 'border-white/10 bg-white/5',
                            )}
                          >
                            <Avatar characterId={member.characterId} size={36} active={isMe} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-display text-sm font-bold text-white">
                                  {member.name}
                                </span>
                                {isMe && (
                                  <span className="rounded-full bg-brand-500/40 px-1.5 py-px font-display text-[9px] font-bold uppercase text-brand-100">
                                    Kamu
                                  </span>
                                )}
                                {member.isHost && (
                                  <span className="rounded-full bg-gold-400/25 px-1.5 py-px font-display text-[9px] font-bold uppercase text-gold-300">
                                    Host
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-medium text-ink-300">
                                {ch.emoji} {ch.name} • 🟢 Terhubung
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const willBeBot = lobby.fillBots && idx < Math.max(2, lobby.totalSeats);
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="flex items-center justify-between rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 text-xs text-ink-300"
                        >
                          <span>Kursi #{idx + 1}: Menunggu teman...</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 font-display text-[10px] font-semibold">
                            {willBeBot ? '🤖 Diisi Bot' : 'Kosong'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick pawn switcher for local player inside lobby */}
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <span className="text-[11px] font-semibold text-ink-300">Ganti pionmu:</span>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                      {CHARACTERS.map((c) => {
                        const taken = takenChars.has(c.id);
                        const active = myChar === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={taken}
                            onClick={() => setMyProfile(myName, c.id)}
                            className={clsx(
                              'flex items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 font-display text-xs font-bold transition-all',
                              active && 'border-gold-300 bg-gold-400/20 text-gold-200',
                              !active && !taken && 'border-white/10 bg-white/5 text-white hover:bg-white/10',
                              taken && 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-35',
                            )}
                          >
                            <img src={c.sprite} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            <span className="truncate text-[10px]">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Room Rules & Map Settings (Editable by Host, visible to Guests) */}
                <div className="glass flex flex-col justify-between rounded-3xl p-4">
                  <div className="space-y-3">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold-300">
                      Pengaturan Room {!isHost && '(Diatur Host)'}
                    </h2>

                    {/* Map Choice */}
                    <div>
                      <span className="text-xs font-semibold text-ink-200">Pilih Peta</span>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {MAPS.filter((m) => !m.locked).map((m) => {
                          const active = lobby.mapId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={!isHost}
                              onClick={() => updateRoomConfig({ mapId: m.id })}
                              className={clsx(
                                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all',
                                active
                                  ? 'border-brand-300 bg-brand-500/25 text-white'
                                  : 'border-white/10 bg-white/5 text-ink-200',
                                !isHost && 'cursor-default',
                              )}
                            >
                              <span className="text-lg">{m.theme.emblem}</span>
                              <div className="min-w-0">
                                <div className="truncate font-display text-xs font-bold">{m.name}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Start Cash */}
                    <div>
                      <span className="text-xs font-semibold text-ink-200">Modal Awal</span>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {CASH_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={!isHost}
                            onClick={() => updateRoomConfig({ startCash: c })}
                            className={clsx(
                              'num rounded-xl border py-1.5 font-display text-xs font-bold',
                              lobby.startCash === c
                                ? 'border-gold-300 bg-gold-400/20 text-gold-300'
                                : 'border-white/10 bg-white/5 text-ink-200',
                            )}
                          >
                            {formatRp(c, { short: true })}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Rounds */}
                    <div>
                      <span className="text-xs font-semibold text-ink-200">Batas Ronde</span>
                      <div className="mt-1 grid grid-cols-4 gap-1.5">
                        {ROUND_OPTIONS.map((r) => (
                          <button
                            key={r ?? 'inf'}
                            type="button"
                            disabled={!isHost}
                            onClick={() => updateRoomConfig({ maxRounds: r })}
                            className={clsx(
                              'num rounded-xl border py-1.5 font-display text-xs font-bold',
                              lobby.maxRounds === r
                                ? 'border-brand-300 bg-brand-500/25 text-white'
                                : 'border-white/10 bg-white/5 text-ink-200',
                            )}
                          >
                            {r === null ? '∞' : `${r}R`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fill empty seats with Bots toggle */}
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <div className="font-display text-xs font-bold text-white">Isi Kursi Kosong dengan Bot</div>
                        <div className="text-[10px] text-ink-300">Supaya tetap ramai 4 pemain</div>
                      </div>
                      <button
                        type="button"
                        disabled={!isHost}
                        onClick={() => updateRoomConfig({ fillBots: !lobby.fillBots })}
                        className={clsx(
                          'rounded-full px-3 py-1 font-display text-xs font-bold transition-colors',
                          lobby.fillBots ? 'bg-daun-500 text-ink-950' : 'bg-white/15 text-ink-200',
                        )}
                      >
                        {lobby.fillBots ? 'AKTIF 🤖' : 'MATI'}
                      </button>
                    </div>
                  </div>

                  {/* Start Button for Host / Waiting status for Guest */}
                  <div className="mt-4">
                    {isHost ? (
                      <Button
                        variant="gold"
                        size="xl"
                        block
                        disabled={!lobby.fillBots && lobby.members.length < 2}
                        icon={<Rocket size={22} />}
                        onClick={startMatch}
                      >
                        {!lobby.fillBots && lobby.members.length < 2
                          ? 'Tunggu Min. 2 Pemain...'
                          : 'GAS, MULAI MABAR!'}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand-300/30 bg-brand-500/15 py-3 font-display text-sm font-bold text-brand-200">
                        <Loader2 size={18} className="animate-spin" />
                        Menunggu Host memulai permainan...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
