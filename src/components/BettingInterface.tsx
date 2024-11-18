import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';

const BettingContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 20px;
    border-radius: 12px;
    border: 2px solid #FFD700;
    color: white;
    z-index: 1000;
`;

const BettingSection = styled.div`
    margin: 15px 0;
    padding: 10px;
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 8px;
`;

const BetInput = styled.input`
    width: 80px;
    padding: 5px;
    margin: 0 10px;
    border-radius: 4px;
    border: 1px solid #FFD700;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    text-align: center;
`;

const BetButton = styled.button<{ $disabled?: boolean }>`
    padding: 8px 16px;
    margin: 5px;
    border-radius: 4px;
    border: none;
    background: ${props => props.$disabled ? '#666' : '#FFD700'};
    color: ${props => props.$disabled ? '#999' : '#000'};
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    transition: all 0.2s;

    &:hover {
        transform: ${props => !props.$disabled && 'translateY(-2px)'};
        opacity: ${props => !props.$disabled && '0.9'};
    }
`;

interface BettingInterfaceProps {
    onClose: () => void;
}

const BettingInterface: React.FC<BettingInterfaceProps> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [bets, setBets] = useState({
        michigan: 0,
        hearts: 0,
        poker: 0,
        kitty: 0
    });

    const player = state.players.find(p => p.isHuman);
    const maxBet = player?.chips || 0;

    const isBlindAuction = state.phase === 'blindAuction';

    const handleBetChange = (section: keyof typeof bets, value: string) => {
        const numValue = Math.min(Math.max(0, parseInt(value) || 0), maxBet);
        setBets(prev => ({ ...prev, [section]: numValue }));
    };

    const handlePlaceBets = () => {
        const totalBet = Object.values(bets).reduce((sum, bet) => sum + bet, 0);
        
        if (totalBet > maxBet) {
            soundManager.play('error');
            return;
        }

        dispatch({ 
            type: 'PLACE_BETS', 
            playerId: player?.id || 0,
            bets: bets
        });
        
        soundManager.play('chipMove');
        onClose();
    };

    return (
        <BettingContainer>
            <h3>{isBlindAuction ? 'Bid for Blind' : 'Place Your Bets'}</h3>
            
            {isBlindAuction ? (
                <BettingSection>
                    <div>Blind Bid</div>
                    <BetInput
                        type="number"
                        min="0"
                        max={maxBet}
                        value={bets.kitty}
                        onChange={(e) => handleBetChange('kitty', e.target.value)}
                    />
                </BettingSection>
            ) : (
                <>
                    <BettingSection>
                        <div>Michigan (Ten, Jack, Queen)</div>
                        <BetInput
                            type="number"
                            min="0"
                            max={maxBet}
                            value={bets.michigan}
                            onChange={(e) => handleBetChange('michigan', e.target.value)}
                        />
                    </BettingSection>
                    
                    <BettingSection>
                        <div>Hearts (King, Ace)</div>
                        <BetInput
                            type="number"
                            min="0"
                            max={maxBet}
                            value={bets.hearts}
                            onChange={(e) => handleBetChange('hearts', e.target.value)}
                        />
                    </BettingSection>
                    
                    <BettingSection>
                        <div>Poker (8-9-10, King-Queen)</div>
                        <BetInput
                            type="number"
                            min="0"
                            max={maxBet}
                            value={bets.poker}
                            onChange={(e) => handleBetChange('poker', e.target.value)}
                        />
                    </BettingSection>
                </>
            )}

            <div>
                <BetButton onClick={onClose}>
                    {isBlindAuction ? 'Pass' : 'Cancel'}
                </BetButton>
                <BetButton 
                    onClick={handlePlaceBets}
                    $disabled={Object.values(bets).reduce((sum, bet) => sum + bet, 0) > maxBet}
                >
                    {isBlindAuction ? 'Place Bid' : 'Place Bets'}
                </BetButton>
            </div>
        </BettingContainer>
    );
};

export default BettingInterface; 