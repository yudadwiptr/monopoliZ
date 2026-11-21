import { AnimatePresence, MotionConfig } from 'framer-motion';
import type { ReactElement } from 'react';
import { useGame, useHumanPending } from '@/store/gameStore';
import type { GameState, Pending } from '@/engine/types';
import { BuyDialog } from './BuyDialog';
import { BuildDialog } from './BuildDialog';
import { AcquireDialog } from './AcquireDialog';
import { CardDialog } from './CardDialog';
import { ChooseTileBanner } from './ChooseTileBanner';
import { IslandDialog } from './IslandDialog';
import { RaiseFundsDialog } from './RaiseFundsDialog';
import { BotCardReveal } from './BotCardReveal';

/** Stable identity per decision so the right dialog animates in/out (and resets its local state). */
function pendingKey(p: Pending, game: GameState): string {
  const turn = `${game.turnCount}`;
  switch (p.kind) {
    case 'buy':
    case 'build':
    case 'acquire':
      return `${p.kind}-${p.tile}-${turn}`;
    case 'choose_tile':
      return `choose-${p.purpose}-${turn}`;
    case 'card':
      return `card-${p.cardId}-${turn}-${game.deck.length}`;
    case 'raise_funds':
      return `raise-${p.amount}-${game.logSeq}`;
    default:
      return `${p.kind}-${turn}`;
  }
}

function renderDecision(pending: Pending, game: GameState): ReactElement | null {
  const key = pendingKey(pending, game);
  switch (pending.kind) {
    case 'buy':
      return <BuyDialog key={key} game={game} pending={pending} />;
    case 'build':
      return <BuildDialog key={key} game={game} pending={pending} />;
    case 'acquire':
      return <AcquireDialog key={key} game={game} pending={pending} />;
    case 'card':
      return <CardDialog key={key} game={game} pending={pending} />;
    case 'choose_tile':
      return <ChooseTileBanner key={key} game={game} pending={pending} />;
    case 'island':
      return <IslandDialog key={key} game={game} pending={pending} />;
    case 'raise_funds':
      return <RaiseFundsDialog key={key} game={game} pending={pending} />;
    case 'roll': // the HUD owns the dice button
    case 'end_turn': // auto-dispatched by the store
    case 'game_over':
      return null;
  }
}

/**
 * Renders the decision UI for the human's pending action (null while animating / during bot turns),
 * plus a passive peek at cards drawn by bots.
 */
export function DecisionLayer() {
  const pending = useHumanPending();
  const game = useGame((s) => s.game);
  const node = pending && game ? renderDecision(pending, game) : null;
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">{node}</AnimatePresence>
      <BotCardReveal />
    </MotionConfig>
  );
}
