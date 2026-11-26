/**
 * Game screen: themed backdrop, 2D flat board, 4 corner player HUD cards, top bar, action dock and modals.
 * - Mobile Portrait: vertical column (`TopBar` -> `P1 & P2` compact grid -> 1:1 square board -> `P3 & P4` compact grid -> thumb-friendly `ActionDock`).
 * - Mobile Landscape & Desktop: centered 1:1 board (`min(92dvh, 92vw)`), 4 corner player cards (`clamp(130px, 18vw, 220px)`), and bottom-center floating dice dock.
 */
import clsx from 'clsx';
import { useState } from 'react';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { DecisionLayer } from '@/ui/dialogs/DecisionLayer';
import {
  ActionDock,
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
        size={layout.panelSize}
        onOpen={onOpenPlayer}
        align={corner === 'tr' || corner === 'br' ? 'right' : 'left'}
        {...flags(id)}
      />
    );
  };
  const hasBottom = slots.includes('bl') || slots.includes('br');

  return (
    <div
      className="relative z-10 flex h-full w-full flex-col items-center justify-between gap-1"
      style={SAFE_PAD}
    >
      {/* Top Bar + Player 1 & Player 2 horizontal compact row */}
      <div className="flex w-full shrink-0 flex-col gap-1 px-0.5">
        <TopBar variant="compact" />
        <div className="grid w-full grid-cols-2 gap-1.5 pt-1">
          {at('tl')}
          {at('tr')}
        </div>
      </div>

      {/* Center 1:1 Square Board Area */}
      <BoardStage className="my-auto w-full flex-1" compact={layout.denseDock} hideDock />

      {/* Bottom HUD: Player 3 & Player 4 horizontal compact row + dedicated Bottom Dice Dock */}
      <div className="flex w-full shrink-0 flex-col items-center gap-1.5 px-0.5">
        {hasBottom && (
          <div className="grid w-full grid-cols-2 gap-1.5">
            {at('bl')}
            {at('br')}
          </div>
        )}
        <div className="flex min-h-[68px] w-full items-center justify-center pb-0.5">
          <ActionDock compact />
        </div>
      </div>
    </div>
  );
}

/**
 * Landscape & Desktop Corner Layout:
 * - Centered 1:1 square board (`min(92dvh, 92vw)`).
 * - 4 Player Panels sit in the 4 screen corners with proportional width (`clamp(130px, 18vw, 220px)`).
 * - Floating bottom-center dice dock (`bottom: 10px`).
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
      {/* Floating Top-Center HUD Bar (Ronde 1/25 & Utility Controls) in the top panel above the board */}
      <div className="pointer-events-none fixed left-1/2 top-1.5 z-30 -translate-x-1/2 sm:top-2">
        <TopBar variant="floating" />
      </div>

      {fullBleed && <BoardStage className="absolute inset-0 z-0" compact={short} />}
      <div className={clsx('pointer-events-none relative flex min-h-0 flex-1', short ? 'gap-1.5' : 'gap-3')}>
        <aside className={aside} style={{ width: layout.sideW }}>
          <div>{at('tl')}</div>
          <div>{at('bl')}</div>
        </aside>
        <main className="flex min-w-0 flex-1 pt-9 sm:pt-10">
          {!fullBleed && <BoardStage className="pointer-events-auto w-full flex-1" compact={short} />}
        </main>
        <aside className={aside} style={{ width: layout.sideW }}>
          <div>{at('tr')}</div>
          <div>{at('br')}</div>
        </aside>
      </div>
    </div>
  );
}

export function GameScreen() {
  const ready = useGame((s) => !!s.game && !!s.view);
  const isMoving = useGame((s) => !!s.view?.moving);
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
    <div
      ref={rootRef}
      data-moving={isMoving ? 'true' : 'false'}
      className={clsx(
        'mz-game relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden text-ink-100',
        isMoving && 'mz-moving',
      )}
    >
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
