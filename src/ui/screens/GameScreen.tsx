/**
 * Game screen: themed backdrop, board, player panels, top bar, action dock and HUD overlays.
 * Layout adapts between portrait (phones), wide (desktop / tablet landscape) and short (phone landscape).
 */
import clsx from 'clsx';
import { useState } from 'react';
import { useGame } from '@/store/gameStore';
import { DecisionLayer } from '@/ui/dialogs/DecisionLayer';
import {
  ActionDock,
  BoardStage,
  CenterToasts,
  ErrorToast,
  EventFeed,
  GameBackdrop,
  LogSheet,
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
  onOpenLog: () => void;
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

function PortraitLayout({ layout, ids, onOpenPlayer, onOpenLog }: LayoutProps) {
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
      <EventFeed variant="ticker" lines={layout.feedLines} onOpen={onOpenLog} className="shrink-0" />
      <div className="mx-auto flex w-full max-w-md shrink-0 items-center" style={{ height: layout.dockH }}>
        <ActionDock layout="stack" dense={layout.denseDock} />
      </div>
    </div>
  );
}

function WideLayout({ layout, ids, onOpenPlayer, onOpenLog }: LayoutProps) {
  const flags = usePanelFlags();
  const slots = cornerSlots(ids.length);
  const at = (corner: Corner) => {
    const seat = slots.indexOf(corner);
    const id = seat >= 0 ? ids[seat] : undefined;
    if (!id) return <div className="min-h-0" />;
    return <PlayerPanel playerId={id} size={layout.panelSize} onOpen={onOpenPlayer} {...flags(id)} />;
  };

  return (
    <div className="relative z-10 flex h-full flex-col gap-3" style={SAFE_PAD}>
      <div className="shrink-0 px-1">
        <TopBar variant="wide" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4 px-1">
        <aside className="flex shrink-0 flex-col justify-between gap-3 pb-1 pt-2" style={{ width: layout.sideW }}>
          {at('tl')}
          <EventFeed variant="card" lines={layout.feedLines} onOpen={onOpenLog} />
          {at('bl')}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <BoardStage className="w-full flex-1" />
          <div className="flex w-full max-w-xl shrink-0 items-center" style={{ height: layout.dockH }}>
            <ActionDock layout="row" />
          </div>
        </main>
        <aside className="flex shrink-0 flex-col justify-between gap-3 pb-1 pt-2" style={{ width: layout.sideW }}>
          {at('tr')}
          {at('br')}
        </aside>
      </div>
    </div>
  );
}

function ShortLayout({ layout, ids, onOpenPlayer, onOpenLog }: LayoutProps) {
  const flags = usePanelFlags();
  return (
    <div className="relative z-10 flex h-full gap-3" style={SAFE_PAD}>
      <aside className="flex shrink-0 flex-col justify-center gap-2 pt-2" style={{ width: layout.sideW }}>
        {ids.map((id) => (
          <PlayerPanel key={id} playerId={id} size={layout.panelSize} onOpen={onOpenPlayer} {...flags(id)} />
        ))}
      </aside>
      <BoardStage className="flex-1" />
      <aside className="flex shrink-0 flex-col gap-2" style={{ width: layout.sideW }}>
        <TopBar variant="stack" />
        <EventFeed variant="ticker" lines={layout.feedLines} onOpen={onOpenLog} className="min-h-0 shrink" />
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
  const [logOpen, setLogOpen] = useState(false);
  useEscPause();

  const layout = computeLayout(size.width, size.height, ids.length);
  const props: LayoutProps = {
    layout,
    ids,
    onOpenPlayer: setDetailId,
    onOpenLog: () => setLogOpen(true),
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
      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <ErrorToast />
      <PauseMenu />
    </div>
  );
}
