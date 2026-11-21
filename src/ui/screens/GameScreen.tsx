/**
 * Game screen: themed backdrop, board, player panels, top bar, action dock and HUD overlays.
 * Layout adapts between portrait (phones), wide (desktop / tablet landscape) and short (phone landscape).
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
  type Corner,
  type HudLayout,
} from '@/ui/hud';
import { PauseMenu } from './PauseMenu';

const SAFE_PAD = {
  paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
  paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
  paddingLeft: 'max(8px, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(8px, env(safe-area-inset-right, 0px))',
} as const;

interface LayoutProps {
  layout: HudLayout;
  ids: string[];
  onOpenPlayer: (id: string) => void;
}

function usePanelFlags() {
  const humans = useHumanCount();
  const leader = useLeaderId();
  const players = useGame((s) => s.game?.players);
  return (id: string) => ({
    isYou: humans === 1 && !!players?.find((p) => p.id === id && !p.isBot),
    leader: leader === id,
  });
}

function PortraitLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  return (
    <div className="relative z-10 flex h-full flex-col gap-1.5" style={SAFE_PAD}>
      <TopBar variant="compact" />
      <div className="grid shrink-0 gap-1.5 pt-1" style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
        {ids.map((id) => (
          <PlayerPanel key={id} playerId={id} size={layout.panelSize} onOpen={onOpenPlayer} {...flags(id)} />
        ))}
      </div>
      <BoardStage className="flex-1" />
      <div className="mx-auto flex w-full max-w-md shrink-0 items-center" style={{ height: layout.dockH }}>
        <ActionDock layout="stack" dense={layout.denseDock} />
      </div>
    </div>
  );
}

function WideLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  // The isometric diamond is 1.41× wider than the board: let it span the whole row behind the corner
  // panels — its left/right tips sit at mid-height, in the gap between the top and bottom panels.
  const fullBleed = useSettings((s) => s.camera === 'iso');
  const slots = cornerSlots(ids.length);
  const at = (corner: Corner) => {
    const seat = slots.indexOf(corner);
    const id = seat >= 0 ? ids[seat] : undefined;
    if (!id) return <div className="min-h-0" />;
    return (
      <PlayerPanel
        playerId={id}
        size={layout.panelSize}
        onOpen={onOpenPlayer}
        className="pointer-events-auto"
        {...flags(id)}
      />
    );
  };
  const aside = 'pointer-events-none relative z-10 flex shrink-0 flex-col justify-between gap-3 pb-1 pt-2';

  return (
    <div className="relative z-10 flex h-full flex-col gap-3" style={SAFE_PAD}>
      {fullBleed && (
        // From the very top of the screen (behind the top bar's empty middle) down to the dock.
        <BoardStage className="absolute inset-x-0 top-0 z-0" style={{ bottom: layout.dockH + 12 }} />
      )}
      <div className="pointer-events-none relative z-20 shrink-0 px-1 [&>header>*]:pointer-events-auto">
        <TopBar variant="wide" />
      </div>
      {/* Click-through row: only the panels and the dock take pointer events, the board below gets the rest. */}
      <div className="pointer-events-none relative flex min-h-0 flex-1 gap-4 px-1">
        <aside className={aside} style={{ width: layout.sideW }}>
          {at('tl')}
          {at('bl')}
        </aside>
        <main className="pointer-events-none flex min-w-0 flex-1 flex-col items-center gap-2">
          {fullBleed ? <div className="flex-1" /> : <BoardStage className="pointer-events-auto w-full flex-1" />}
          <div
            className="pointer-events-auto relative z-10 flex w-full max-w-[460px] shrink-0 items-center"
            style={{ height: layout.dockH }}
          >
            <ActionDock layout="row" compact />
          </div>
        </main>
        <aside className={aside} style={{ width: layout.sideW }}>
          {at('tr')}
          {at('br')}
        </aside>
      </div>
    </div>
  );
}

function ShortLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  return (
    <div className="relative z-10 flex h-full gap-3" style={SAFE_PAD}>
      <aside
        className="scrollbar-thin flex min-h-0 shrink-0 flex-col gap-2 overflow-y-auto py-2"
        style={{ width: layout.sideW, justifyContent: 'safe center' }}
      >
        {ids.map((id) => (
          <PlayerPanel key={id} playerId={id} size={layout.panelSize} onOpen={onOpenPlayer} {...flags(id)} />
        ))}
      </aside>
      <BoardStage className="flex-1" />
      <aside className="flex shrink-0 flex-col gap-2" style={{ width: layout.sideW }}>
        <TopBar variant="stack" />
        <div className="mt-auto flex shrink-0 items-end pt-6">
          <ActionDock layout="stack" compact />
        </div>
      </aside>
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
    <div ref={rootRef} className={clsx('relative h-[100dvh] w-full overflow-hidden text-ink-100')}>
      <GameBackdrop />
      {ready && (
        <>
          {layout.mode === 'portrait' && <PortraitLayout {...props} />}
          {layout.mode === 'wide' && <WideLayout {...props} />}
          {layout.mode === 'short' && <ShortLayout {...props} />}
          <MonopolyAlertBanner />
          <CenterToasts />
          <TurnBanner />
        </>
      )}
      <DecisionLayer />
      <PlayerDetailSheet playerId={detailId} onClose={() => setDetailId(null)} />
      <ErrorToast />
      <PauseMenu />
    </div>
  );
}
