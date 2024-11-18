import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';
import { getCardBackPath } from '../utils/cardAssets';
import { Card } from '../types/GameTypes';

const DeadHandDisplay = styled.div`
    position: relative;
    width: 100px;
    height: 140px;
    margin: 10px;
    text-align: center;
    color: white;
`;

const CardStack = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    margin: 10px 0;
`;

const CardCount = styled.div`
    font-size: 0.8em;
    color: #FFD700;
    margin-top: 5px;
`;

const DealerPrompt = styled.div`
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 10px;
    border-radius: 8px;
    white-space: nowrap;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    background: ${props => props.$variant === 'primary' ? '#4CAF50' : '#f44336'};
    color: white;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        opacity: 0.9;
    }
`;

const BidInterface = styled.div`
    position: absolute;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 10px;
    border-radius: 8px;
    text-align: center;
`;

const BidInput = styled.input`
    width: 60px;
    padding: 4px;
    margin: 0 8px;
    border-radius: 4px;
    border: 1px solid #666;
`;

interface Props {
    cards: Card[];
}

const DeadHand: React.FC<Props> = ({ cards }) => {
    const { state, dispatch } = useGame();
    const [showBidding, setShowBidding] = useState(false);
    const [currentBid, setCurrentBid] = useState(0);
    const [bidAmount, setBidAmount] = useState('');

    const isDealer = state.currentPlayer === state.dealerId;
    const currentPlayer = state.players[state.currentPlayer];

    const handleDealerDecision = (takeHand: boolean) => {
        soundManager.play('cardMove');
        if (takeHand) {
            dispatch({ 
                type: 'TAKE_DEAD_HAND', 
                playerId: state.dealerId 
            });
        } else {
            setShowBidding(true);
            dispatch({ type: 'START_DEAD_HAND_BIDDING' });
        }
    };

    const handleBid = () => {
        const bid = parseInt(bidAmount);
        if (bid > currentBid && bid <= currentPlayer.chips) {
            soundManager.play('chipMove');
            setCurrentBid(bid);
            dispatch({ 
                type: 'PLACE_DEAD_HAND_BID', 
                playerId: currentPlayer.id, 
                amount: bid 
            });
            setBidAmount('');
        }
    };

    const handlePass = () => {
        dispatch({ type: 'PASS_DEAD_HAND_BID', playerId: currentPlayer.id });
    };

    return (
        <DeadHandDisplay>
            <div>Dead Hand</div>
            <CardStack>
                {cards.map((_, index) => (
                    <img
                        key={index}
                        src={getCardBackPath('red')}
                        alt="Card back"
                        style={{
                            position: 'absolute',
                            top: index * 2,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: `rotate(${index * 2}deg)`
                        }}
                    />
                ))}
            </CardStack>
            <CardCount>{cards.length} cards</CardCount>

            {isDealer && !showBidding && (
                <DealerPrompt>
                    Take Dead Hand?
                    <ButtonContainer>
                        <Button $variant="primary" onClick={() => handleDealerDecision(true)}>
                            Yes
                        </Button>
                        <Button $variant="secondary" onClick={() => handleDealerDecision(false)}>
                            No
                        </Button>
                    </ButtonContainer>
                </DealerPrompt>
            )}

            {showBidding && !isDealer && (
                <BidInterface>
                    Current Bid: {currentBid}
                    <div>
                        <BidInput
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            min={currentBid + 1}
                            max={currentPlayer.chips}
                        />
                        <ButtonContainer>
                            <Button 
                                $variant="primary"
                                onClick={handleBid}
                                disabled={!bidAmount || parseInt(bidAmount) <= currentBid}
                            >
                                Bid
                            </Button>
                            <Button $variant="secondary" onClick={handlePass}>
                                Pass
                            </Button>
                        </ButtonContainer>
                    </div>
                </BidInterface>
            )}
        </DeadHandDisplay>
    );
};

export default DeadHand; 