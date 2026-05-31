import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { canPassLead, leadColorLabel } from '../game/engine/michigan';
import { describePayCardsHeld } from '../game/engine/payCards';
import { isEliminated } from '../game/engine/playerStatus';
import { useAchievements } from '../context/AchievementContext';
import { displayPlayerName } from '../utils/playerName';

const ActionHint = styled.div`
  max-width: 560px;
  margin: 0 auto 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.82);
  border: 1px solid rgba(255, 215, 0, 0.35);
  font-size: 0.84rem;
  text-align: center;
  line-height: 1.35;
`;

const ActionBar = styled.div<{ $focus?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 0 auto 4px;
  max-width: 560px;

  ${(p) =>
    p.$focus
      ? `
    button {
      transform: scale(1.06);
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
    }
  `
      : ''}
`;

const Btn = styled.button<{ $variant?: 'primary' | 'danger'; $focus?: boolean }>`
  padding: ${(p) => (p.$focus ? '9px 16px' : '8px 14px')};
  font-size: ${(p) => (p.$focus ? '0.95rem' : '0.9rem')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  background: ${(p) =>
    p.$variant === 'danger' ? '#a33' : p.$variant === 'primary' ? '#ffd700' : '#2a653d'};
  color: ${(p) => (p.$variant === 'primary' ? '#000' : '#fff')};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PlayerActionBar: React.FC = () => {
  const { state, dispatch } = useGame();
  const { activeEffects } = useAchievements();
  const current = state.players[state.currentPlayer];
  const human = state.players.find((p) => p.isHuman);
  if (!human) return null;
  if (isEliminated(human) || state.phase === 'gameOver') return null;

  const isMyTurn = current?.isHuman;
  const isDealer = current?.id === state.dealerId;
  const auction = state.blindAuction;
  const winner =
    auction.highBidder !== null ? state.players[auction.highBidder] : null;

  const mustPassLead =
    state.phase === 'michigan' &&
    isMyTurn &&
    canPassLead(
      current!.cards,
      state.michigan,
      current!.id,
      state.currentPlayer
    );

  const canDealerBlind =
    isMyTurn && state.phase === 'dealerBlindChoice' && isDealer;

  const dealerPayCards =
    canDealerBlind && current ? describePayCardsHeld(current.cards) : [];
  const dealerBlockedFromSwap = dealerPayCards.length > 0;

  const canBidInAuction =
    state.phase === 'blindAuction' &&
    isMyTurn &&
    !isDealer &&
    !auction.awaitingDealerClose &&
    current &&
    !auction.passed[current.id];

  const bidderPayCards =
    canBidInAuction && current ? describePayCardsHeld(current.cards) : [];
  const bidderBlockedFromBlind = bidderPayCards.length > 0;

  const canCloseAuction =
    state.phase === 'blindAuction' &&
    isMyTurn &&
    isDealer &&
    auction.awaitingDealerClose;

  const canPoker =
    state.phase === 'poker' && isMyTurn && !state.poker.folded[current!.id];

  const canNextRound = state.phase === 'roundSummary';

  const hasActions =
    mustPassLead ||
    canDealerBlind ||
    canBidInAuction ||
    canCloseAuction ||
    canPoker ||
    canNextRound;

  if (!hasActions) return null;

  let hint: React.ReactNode = null;

  if (canDealerBlind) {
    hint = (
      <>
        <strong>Dealer — blind hand</strong> ({state.deadHand.length} cards face down).{' '}
        {dealerBlockedFromSwap ? (
          <>
            You hold a pay card ({dealerPayCards.join(', ')}) — you cannot swap with the blind.
            Auction or keep your dealt hand.
          </>
        ) : (
          <>Swap with the blind, send it to auction, or keep your dealt hand.</>
        )}
      </>
    );
  } else if (canBidInAuction) {
    hint = (
      <>
        <strong>Blind auction</strong> — current high bid:{' '}
        {auction.highBid > 0 ? `${auction.highBid} chips` : 'none'}. Passing is permanent
        for this auction
        {auction.highBidder === current!.id && auction.highBid > 0
          ? ' — if you pass, you withdraw your bid and forfeit the blind hand'
          : ''}
        .
        {bidderBlockedFromBlind && (
          <>
            {' '}
            You hold a pay card ({bidderPayCards.join(', ')}) — you cannot bid for the blind.
          </>
        )}
      </>
    );
  } else if (canCloseAuction) {
    hint = winner ? (
      <>
        <strong>Auction closed.</strong> {displayPlayerName(winner)} is the high bidder at{' '}
        {auction.highBid} chips. They swap with the blind and pay you. Tap Confirm to continue to
        Pay Cards.
      </>
    ) : (
      <>
        <strong>No bids.</strong> Everyone passed — your hand stays as dealt and the blind stays
        face down. Tap Continue for Pay Cards.
      </>
    );
  } else if (canPoker) {
    const toCall = state.poker.currentBet - (state.poker.playerBets[current!.id] || 0);
    hint =
      toCall > 0 ? (
        <>
          <strong>Poker</strong> — call {toCall} chips or raise/fold.
        </>
      ) : (
        <>
          <strong>Poker</strong> — check, bet, or fold.
        </>
      );
  } else if (mustPassLead) {
    hint = (
      <>
        <strong>Michigan</strong> — you cannot lead {leadColorLabel(state.michigan.leadColor)}.
      </>
    );
  } else if (canNextRound) {
    hint = (
      <>
        <strong>Round complete</strong> — deal the next hand when ready.
      </>
    );
  }

  const toCall =
    canPoker && current
      ? state.poker.currentBet - (state.poker.playerBets[current.id] || 0)
      : 0;

  return (
    <>
      {hint && <ActionHint>{hint}</ActionHint>}
      <ActionBar $focus={isMyTurn && activeEffects.actionFocus}>
        {canDealerBlind && (
          <>
            <Btn
              $variant="primary"
              onClick={() => dispatch({ type: 'DEALER_BLIND_CHOICE', choice: 'swap' })}
              disabled={dealerBlockedFromSwap}
            >
              Swap with Blind
            </Btn>
            <Btn onClick={() => dispatch({ type: 'DEALER_BLIND_CHOICE', choice: 'auction' })}>
              Auction Blind
            </Btn>
            {state.houseRules.dealerBlindKeepOption && (
              <Btn onClick={() => dispatch({ type: 'DEALER_BLIND_CHOICE', choice: 'keep' })}>
                Keep Hand
              </Btn>
            )}
          </>
        )}

        {canBidInAuction && current && (
          <>
            <Btn
              $variant="primary"
              onClick={() =>
                dispatch({
                  type: 'BLIND_AUCTION_BID',
                  amount: Math.max(auction.highBid + 1, 1),
                })
              }
              disabled={bidderBlockedFromBlind || current.chips < auction.highBid + 1}
            >
              Bid {auction.highBid + 1}
            </Btn>
            <Btn onClick={() => dispatch({ type: 'BLIND_AUCTION_PASS' })}>Pass</Btn>
          </>
        )}

        {canCloseAuction && (
          <Btn $variant="primary" onClick={() => dispatch({ type: 'BLIND_AUCTION_RESOLVE' })}>
            {winner
              ? `Confirm — ${displayPlayerName(winner)} takes blind (${auction.highBid})`
              : 'Continue — blind stays face down'}
          </Btn>
        )}

        {canPoker && current && (
          <>
            {toCall === 0 && (
              <Btn onClick={() => dispatch({ type: 'POKER_ACTION', action: 'check' })}>Check</Btn>
            )}
            {toCall > 0 && (
              <Btn onClick={() => dispatch({ type: 'POKER_ACTION', action: 'call' })}>
                Call {toCall}
              </Btn>
            )}
            <Btn
              $variant="primary"
              onClick={() => dispatch({ type: 'POKER_ACTION', action: 'bet', amount: 2 })}
              disabled={current.chips < 2}
            >
              Bet 2
            </Btn>
            <Btn
              onClick={() => dispatch({ type: 'POKER_ACTION', action: 'raise', amount: 2 })}
              disabled={current.chips < toCall + 2}
            >
              Raise +2
            </Btn>
            <Btn
              $variant="danger"
              onClick={() => dispatch({ type: 'POKER_ACTION', action: 'fold' })}
            >
              Fold
            </Btn>
          </>
        )}

        {mustPassLead && (
          <Btn
            $variant="danger"
            onClick={() => dispatch({ type: 'MICHIGAN_PASS_LEAD' })}
          >
            Cannot lead {leadColorLabel(state.michigan.leadColor)} — pay 1 to kitty
          </Btn>
        )}

        {canNextRound && (
          <Btn $variant="primary" onClick={() => dispatch({ type: 'START_NEW_ROUND' })}>
            Next Round
          </Btn>
        )}
      </ActionBar>
    </>
  );
};

export default PlayerActionBar;
