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
import { PlayHint } from '@/ui/hud/PlayHint';
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
  // Phones held upright: two players above the board, two below (same seats as the desktop corners),
  // so names are readable and the tall screen frames the board instead of leaving empty space.
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
  return (
    <div className="relative z-10 flex h-full flex-col gap-2" style={SAFE_PAD}>
      <TopBar variant="compact" />
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {at('tl')}
        {at('tr')}
      </div>
      <BoardStage className="flex-1" compact={layout.denseDock} />
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {at('bl')}
        {at('br')}
      </div>
    </div>
  );
}

/**
 * Desktop / landscape: slim player strips in the four screen corners, the roll button in the middle of the
 * board. In the isometric camera the board fills the whole screen behind everything (like a mobile board
 * game); its diamond tips sit at mid-height, in the gap between the top and bottom strips.
 */
function CornerLayout({ layout, ids, onOpenPlayer }: LayoutProps) {
  const flags = usePanelFlags();
  const fullBleed = useSettings((s) => s.camera === 'iso');
  const short = layout.mode === 'short';
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
        align={corner === 'tr' || corner === 'br' ? 'right' : 'left'}
        className="pointer-events-auto"
        {...flags(id)}
      />
    );
  };
  const aside = clsx(
    'pointer-events-none relative z-10 flex shrink-0 flex-col justify-between',
    short ? 'gap-2 pb-0.5 pt-1' : 'gap-3 pb-1 pt-2',
  );

  return (
    <div className={clsx('relative z-10 flex h-full flex-col', short ? 'gap-1' : 'gap-2')} style={SAFE_PAD}>
      {fullBleed && <BoardStage className="absolute inset-0 z-0" compact={short} />}
      <div className="pointer-events-none relative z-20 shrink-0 px-1 [&>header>*]:pointer-events-auto">
        <TopBar variant={layout.tinyTop ? 'mini' : short ? 'compact' : 'wide'} />
      </div>
      {/* Click-through row: only the panels take pointer events, the board below gets the rest. */}
      <div className={clsx('pointer-events-none relative flex min-h-0 flex-1 px-1', short ? 'gap-2' : 'gap-4')}>
        <aside className={aside} style={{ width: layout.sideW }}>
          {at('tl')}
          {at('bl')}
        </aside>
        <main className="flex min-w-0 flex-1">
          {!fullBleed && <BoardStage className="pointer-events-auto w-full flex-1" compact={short} />}
        </main>
        <aside className={aside} style={{ width: layout.sideW }}>
          {at('tr')}
          {at('br')}
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
    <div ref={rootRef} className={clsx('relative h-[100dvh] w-full overflow-hidden text-ink-100')}>
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
