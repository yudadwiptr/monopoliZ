/**
 * Game screen: themed backdrop, board, player panels, top bar, action dock and HUD overlays.
 * Styled after LINE Let's Get Rich on both mobile portrait (2 top corners + full board + 2 bottom corners)
 * and mobile/desktop landscape (full-bleed board + 4 flush corner HUD plates with 1st/2nd/3rd/4th rank orbs).
 */
import clsx from 'clsx';
import { useState } from 'react';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { DecisionLayer } from '@/ui/dialogs/DecisionLayer';
import {
  BoardStage,
  CenterToasts,
  ErrorToast,
  GameBackdrop,
  MonopolyAlertBanner,
  PlayerDetailSheet,
  PlayerPanel,
  TopBar,
  TurnBanner,
  computeLayout,
  cornerSlots,
  useEscPause,
  useHumanCount,
  useLeaderId,
  useMeasure,
  usePlayerIds,
  usePlayerRanks,
  type Corner,
  type HudLayout,
} from '@/ui/hud';
import { PlayHint } from '@/ui/hud/PlayHint';
import { PauseMenu } from './PauseMenu';

const SAFE_PAD = {
  paddingTop: 'max(6px, env(safe-area-inset-top, 0px))',
  paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
  paddingLeft: 'max(6px, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(6px, env(safe-area-inset-right, 0px))',
} as const;

interface LayoutProps {
  layout: HudLayout;
  ids: string[];
  onOpenPlayer: (id: string) => void;
}

function usePanelFlags() {
  const humans = useHumanCount();
  const leader = useLeaderId();
  const ranks = usePlayerRanks();
  const players = useGame((s) => s.game?.players);
  const localPlayerId = useGame((s) => s.localPlayerId);
  return (id: string) => ({
    isYou: localPlayerId ? id === localPlayerId : humans === 1 && !!players?.find((p) => p.id === id && !p.isBot),
    leader: leader === id,
    rank: ranks[id] ?? 1,
  });
}

function PortraitLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  const slots = cornerSlots(ids.length);
  const at = (corner: Corner) => {
    const seat = slots.indexOf(corner);
    const id = seat >= 0 ? ids[seat] : undefined;
    if (!id) return <div />;
    return (
      <PlayerPanel
        playerId={id}
        size="full"
        onOpen={onOpenPlayer}
        align={corner === 'tr' || corner === 'br' ? 'right' : 'left'}
        {...flags(id)}
      />
    );
  };
  const hasBottom = slots.includes('bl') || slots.includes('br');

  return (
    <div className="relative z-10 flex h-full flex-col gap-1.5" style={SAFE_PAD}>
      <TopBar variant="compact" />
      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        {at('tl')}
        {at('tr')}
      </div>
      <BoardStage className="flex-1" compact={layout.denseDock} />
      {hasBottom && (
        <div className="grid shrink-0 grid-cols-2 gap-1.5">
          {at('bl')}
          {at('br')}
        </div>
      )}
    </div>
  );
}

/**
 * Get Rich Full-Screen Corner Layout (Mobile Landscape & Desktop):
 * - No full-width TopBar stealing vertical height: the diamond board reaches from top:0 to bottom:0!
 * - 4 Player Panels sit flush in the 4 screen corners (tl, tr, bl, br) with 1st/2nd/3rd/4th orbs & Total/Kas rows.
 * - Floating compact utility dock (Ronde, Speed, Camera, Sound, Pause) tucks into the bottom-right corner margin.
 */
function CornerLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  const fullBleed = useSettings((s) => s.camera === 'iso');
  const short = layout.mode === 'short';
  const slots = cornerSlots(ids.length);
  const at = (corner: Corner) => {
    const seat = slots.indexOf(corner);
    const id = seat >= 0 ? ids[seat] : undefined;
    if (!id) return null;
    return (
      <PlayerPanel
        playerId={id}
        size={layout.panelSize}
        onOpen={onOpenPlayer}
        align={corner === 'tr' || corner === 'br' ? 'right' : 'left'}
        className="pointer-events-auto"
        {...flags(id)}
      />
    );
  };
  const aside = 'pointer-events-none relative z-10 flex shrink-0 flex-col justify-between';

  return (
    <div className="relative z-10 flex h-full flex-col" style={SAFE_PAD}>
      {fullBleed && <BoardStage className="absolute inset-0 z-0" compact={short} />}
      <div className={clsx('pointer-events-none relative flex min-h-0 flex-1', short ? 'gap-2' : 'gap-4')}>
        <aside className={aside} style={{ width: layout.sideW }}>
          <div>{at('tl')}</div>
          <div>{at('bl')}</div>
        </aside>
        <main className="flex min-w-0 flex-1">
          {!fullBleed && <BoardStage className="pointer-events-auto w-full flex-1" compact={short} />}
        </main>
        <aside className={aside} style={{ width: layout.sideW }}>
          <div>{at('tr')}</div>
          <div className="flex flex-col items-end gap-1.5">
            <TopBar variant="floating" />
            {at('br')}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function GameScreen() {
  const ready = useGame((s) => !!s.game && !!s.view);
  const ids = usePlayerIds();
  const [rootRef, size] = useMeasure<HTMLDivElement>();
  const [detailId, setDetailId] = useState<string | null>(null);
  useEscPause();

  const layout = computeLayout(size.width, size.height, ids.length);
  const props: LayoutProps = {
    layout,
    ids,
    onOpenPlayer: setDetailId,
  };

  return (
    <div ref={rootRef} className={clsx('mz-game relative h-[100dvh] w-full overflow-hidden text-ink-100')}>
      <GameBackdrop />
      {ready && (
        <>
          {layout.mode === 'portrait' && <PortraitLayout {...props} />}
          {layout.mode !== 'portrait' && <CornerLayout {...props} />}
          <MonopolyAlertBanner />
          <CenterToasts />
          <TurnBanner />
        </>
      )}
      <DecisionLayer />
      <PlayerDetailSheet playerId={detailId} onClose={() => setDetailId(null)} />
      <ErrorToast />
      <PauseMenu />
      <PlayHint />
    </div>
  );
}
