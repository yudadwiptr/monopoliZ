import { motion } from 'framer-motion';
import { House, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useGame } from '@/store/gameStore';
import { LANDMARK_LEVEL } from '@/engine/economy';
import { defsOf, mapOf, playerById, propertiesOf, ranking } from '@/engine/selectors';
import type { GameState, PlayerState, WinReason } from '@/engine/types';
import { Button } from '@/ui/common';
import { MenuBackdrop } from './parts/MenuBackdrop';
import { WinnerHero } from './parts/results/WinnerHero';
import { RankingList, type RankRow } from './parts/results/RankingList';
import { useWinnerConfetti } from './parts/results/useWinnerConfetti';

interface ResultData {
  winner: PlayerState;
  reason: WinReason | null;
  rows: RankRow[];
  caption: string;
  mapName: string;
}

function captionFor(game: GameState, winner: PlayerState): string {
  const humans = game.players.filter((p) => !p.isBot);
  if (!winner.isBot) {
    return humans.length === 1
      ? 'Selamat, kamu resmi jadi Sultan Nusantara! Cuan-nya nggak ngotak. 👑'
      : `Selamat ${winner.name}! Sultan baru telah lahir. 👑`;
  }
  if (humans.length === 0) return 'Pertandingan para bot selesai. Seru juga ditonton! 🍿';
  return 'Yah, bot-nya lagi hoki. Gas revans, pasti bisa! 😤';
}

function buildResult(game: GameState): ResultData | null {
  const ranked = ranking(game);
  const winner = playerById(game, game.winner?.playerId) ?? ranked[0]?.player;
  if (!winner) return null;
  let defs: ReturnType<typeof defsOf> = [];
  let mapName = '';
  try {
    defs = defsOf(game);
    mapName = mapOf(game).name;
  } catch {
    /* unknown map in an old save — stats degrade gracefully */
  }
  // The winner always tops the list (a monopoly win can beat a richer player).
  const ordered = [...ranked.filter((r) => r.player.id === winner.id), ...ranked.filter((r) => r.player.id !== winner.id)];
  const rows: RankRow[] = ordered.map(({ player, assets }) => ({
    player,
    assets,
    properties: propertiesOf(game, player.id).length,
    landmarks: game.tiles.filter(
      (t, i) => t.owner === player.id && t.level === LANDMARK_LEVEL && defs[i]?.kind === 'city',
    ).length,
  }));
  return { winner, reason: game.winner?.reason ?? null, rows, caption: captionFor(game, winner), mapName };
}

function NoResult({ onMenu }: { onMenu(): void }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop variant="calm" />
      <div className="relative z-10 grid h-full place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="glass-strong w-full max-w-sm p-8 text-center"
        >
          <div className="text-6xl" style={{ animation: 'mz-bob 3s ease-in-out infinite' }} aria-hidden>
            🤔
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">Belum ada pemenang</h1>
          <p className="mt-1 text-sm text-ink-300">Main sampai tuntas dulu, baru deh ada sultan yang dinobatkan.</p>
          <Button variant="primary" size="lg" block className="mt-6" icon={<House size={20} aria-hidden />} onClick={onMenu}>
            Menu Utama
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

/** Winner celebration + final standings. */
export function ResultsScreen() {
  const game = useGame((s) => s.game);
  const restartSame = useGame((s) => s.restartSame);
  const quitToMenu = useGame((s) => s.quitToMenu);
  const setScreen = useGame((s) => s.setScreen);

  const data = useMemo(() => (game ? buildResult(game) : null), [game]);
  const burst = useWinnerConfetti(data?.winner.color ?? null);

  if (!game || !data) return <NoResult onMenu={() => setScreen('menu')} />;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuBackdrop variant="calm" tint={data.winner.color} />

      <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pt-[max(0.5rem,env(safe-area-inset-top))] lg:max-w-5xl lg:flex-row lg:items-center lg:gap-12">
          <div className="lg:flex-1">
            <WinnerHero player={data.winner} reason={data.reason} caption={data.caption} onCelebrate={burst} />
          </div>

          <div className="mt-6 flex flex-1 flex-col lg:mt-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mb-3 flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold lg:justify-start"
            >
              {data.mapName && (
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white">🗺️ {data.mapName}</span>
              )}
              <span className="num rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white">
                Ronde {game.round}
              </span>
              <span className="num rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white">
                {game.players.length} pemain
              </span>
            </motion.div>

            <RankingList rows={data.rows} />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 1.3 }}
              className="sticky bottom-0 mt-auto grid grid-cols-2 gap-3 bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 lg:static lg:mt-6 lg:bg-none"
            >
              <Button variant="primary" size="lg" block icon={<RotateCcw size={20} aria-hidden />} onClick={restartSame}>
                Main Lagi
              </Button>
              <Button variant="glass" size="lg" block icon={<House size={20} aria-hidden />} onClick={quitToMenu}>
                Menu Utama
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
