import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const ModalContent = styled.div`
    background: rgba(0, 0, 0, 0.9);
    padding: 30px;
    border-radius: 12px;
    border: 2px solid #FFD700;
    color: white;
    text-align: center;
    max-width: 400px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: 10px 20px;
    margin: 5px;
    border-radius: 4px;
    border: none;
    background: ${props => props.$variant === 'primary' ? '#FFD700' : '#666'};
    color: ${props => props.$variant === 'primary' ? '#000' : '#fff'};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        opacity: 0.9;
    }
`;

const BidInput = styled.input`
    width: 80px;
    padding: 8px;
    margin: 10px;
    border-radius: 4px;
    border: 1px solid #FFD700;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    text-align: center;
`;

interface BlindAuctionModalProps {
    onClose: () => void;
    isDealer: boolean;
}

export const BlindAuctionModal: React.FC<BlindAuctionModalProps> = ({ onClose, isDealer }) => {
    const { state, dispatch } = useGame();
    const [currentBid, setCurrentBid] = useState(0);
    const player = state.players.find(p => p.isHuman);

    const handleDealerChoice = (choice: 'swap' | 'auction' | 'keep') => {
        dispatch({ type: 'DEALER_BLIND_CHOICE', choice });
        soundManager.play('chipMove');
        onClose();
    };

    const handleBid = () => {
        if (currentBid <= 0 || currentBid > (player?.chips || 0)) {
            soundManager.play('error');
            return;
        }
        dispatch({ 
            type: 'BID_FOR_BLIND', 
            playerId: player?.id || 0,
            amount: currentBid 
        });
        soundManager.play('chipMove');
        onClose();
    };

    return (
        <ModalOverlay>
            <ModalContent>
                {isDealer ? (
                    <>
                        <h3>Dealer's Choice</h3>
                        <p>What would you like to do with the blind hand?</p>
                        <div>
                            <ActionButton 
                                $variant="primary"
                                onClick={() => handleDealerChoice('swap')}
                            >
                                Swap Hands
                            </ActionButton>
                            <ActionButton 
                                onClick={() => handleDealerChoice('auction')}
                            >
                                Auction Hand
                            </ActionButton>
                            <ActionButton 
                                onClick={() => handleDealerChoice('keep')}
                            >
                                Keep Current Hand
                            </ActionButton>
                        </div>
                    </>
                ) : (
                    <>
                        <h3>Bid for Blind Hand</h3>
                        <p>How much would you like to bid for the blind hand?</p>
                        <div>
                            <BidInput
                                type="number"
                                min="0"
                                max={player?.chips || 0}
                                value={currentBid}
                                onChange={(e) => setCurrentBid(parseInt(e.target.value) || 0)}
                            />
                            <div>Maximum bid: {player?.chips || 0} chips</div>
                        </div>
                        <div>
                            <ActionButton onClick={onClose}>Pass</ActionButton>
                            <ActionButton 
                                $variant="primary"
                                onClick={handleBid}
                                disabled={currentBid <= 0 || currentBid > (player?.chips || 0)}
                            >
                                Place Bid
                            </ActionButton>
                        </div>
                    </>
                )}
            </ModalContent>
        </ModalOverlay>
    );
};

export default BlindAuctionModal; 