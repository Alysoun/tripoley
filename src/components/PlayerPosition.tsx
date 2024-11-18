import React from 'react';
import styled from 'styled-components';
import { Player } from '../types/GameTypes';

interface PlayerPositionProps {
    player: Player;
    isDealer: boolean;
    isHuman: boolean;
    totalPlayers: number;
}

// Define a type for the position coordinates
interface PositionCoord {
    readonly left: string;
    readonly top: string;
}

// Define valid player counts as a type
type ValidPlayerCount = 4 | 5 | 6 | 7 | 8 | 9;

// Type the POSITION_LAYOUTS object
const POSITION_LAYOUTS: Record<ValidPlayerCount, readonly PositionCoord[]> = {
    4: [
        { left: '65%', top: '15%' },    // Player 1
        { left: '75%', top: '60%' },    // Player 2 
        { left: '25%', top: '60%' },    // Player 3
        { left: '30%', top: '20%' }     // Player 4
    ],
    5: [
        { left: '75%', top: '30%' },     // Player 1
        { left: '70%', top: '65%' },     // Player 2
        { left: '30%', top: '65%' },     // Player 3
        { left: '30%', top: '20%' },     // Player 4
        { left: '65%', top: '10%' },     // Player 5
    ],
    6: [
        { left: '70%', top: '25%' },     // Player 1
        { left: '75%', top: '50%' },     // Player 2
        { left: '70%', top: '70%' },     // Player 3
        { left: '25%', top: '55%' },     // Player 4
        { left: '30%', top: '19%' },     // Player 5
        { left: '50%', top: '10%' },     // Player 6
    ],
    7: [
        { left: '70%', top: '15%' },     // Player 1
        { left: '75%', top: '30%' },     // Player 2
        { left: '75%', top: '55%' },     // Player 3
        { left: '65%', top: '70%' },     // Player 4
        { left: '28%', top: '62%' },     // Player 5
        { left: '28.3%', top: '35.8%' },     // Player 6
        { left: '33.7%', top: '21.5%' },     // Player 7
    ],
    8: [
        { left: '70%', top: '20%' },     // Player 1
        { left: '70%', top: '45%' },     // Player 2
        { left: '70%', top: '70%' },     // Player 3
        { left: '30%', top: '65%' },     // Player 4
        { left: '25%', top: '45%' },     // Player 5
        { left: '28.8%', top: '25%' },     // Player 6
        { left: '40%', top: '10%' },     // Player 7
        { left: '56.2%', top: '10%' },     // Player 8
    ],
    9: [
        { left: '65%', top: '12%' },     // Player 1
        { left: '75%', top: '23%' },     // Player 2
        { left: '75%', top: '39%' },     // Player 3
        { left: '75%', top: '55%' },     // Player 4
        { left: '66.8%', top: '70.3%' },     // Player 5
        { left: '31.8%', top: '64.7%' },     // Player 6
        { left: '25%', top: '49%' },     // Player 7
        { left: '25.2%', top: '30.5%' },     // Player 8
        { left: '33%', top: '15.7%' },     // Player 9
    ]
} as const;

const PlayerContainer = styled.div<{ $position: number; $totalPlayers: number }>`
    position: absolute;
    transform-origin: center center;
    ${({ $position, $totalPlayers }) => {
        const positions = POSITION_LAYOUTS[$totalPlayers];
        if (!positions) return '';

        const position = positions[$position];
        if (!position) return '';

        return `
            left: ${position.left};
            top: ${position.top};
            transform: translate(-50%, -50%);
            transition: all 0.3s ease-in-out;
        `;
    }}
`;

const PlayerDisplay = styled.div<{ $isHuman: boolean }>`
    position: relative;
    background: ${props => props.$isHuman ? 
        'linear-gradient(to bottom, #2C3E50, #3498DB)' : 
        'rgba(0, 0, 0, 0.8)'};
    border: ${props => props.$isHuman ? '2px solid #FFD700' : 'none'};
    padding: 10px;
    border-radius: 8px;
    color: white;
    text-align: center;
    min-width: 120px;
    box-shadow: ${props => props.$isHuman ? 
        '0 0 20px rgba(255, 215, 0, 0.5)' : 
        '0 4px 6px rgba(0, 0, 0, 0.2)'};
    transform: ${props => props.$isHuman ? 'scale(1.1)' : 'scale(1)'};
    z-index: 10;

    // Add responsive sizing
    @media (max-width: 768px) {
        min-width: 80px;
        padding: 8px;
        font-size: 0.9em;
    }

    @media (max-width: 480px) {
        min-width: 60px;
        padding: 6px;
        font-size: 0.8em;
    }
`;

const DealerBadge = styled.div`
    position: absolute;
    top: -15px;
    right: -15px;
    background: #FFD700;
    color: #1a1a1a;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: 2px solid #FFF;
    animation: dealerGlow 2s infinite;
    z-index: 11;

    @keyframes dealerGlow {
        0% { box-shadow: 0 0 5px #FFD700; }
        50% { box-shadow: 0 0 15px #FFD700; }
        100% { box-shadow: 0 0 5px #FFD700; }
    }

    @media (max-width: 768px) {
        width: 20px;
        height: 20px;
        font-size: 12px;
        top: -10px;
        right: -10px;
    }

    @media (max-width: 480px) {
        width: 16px;
        height: 16px;
        font-size: 10px;
        top: -8px;
        right: -8px;
    }
`;

const PlayerPosition: React.FC<PlayerPositionProps> = ({ 
    player, 
    isDealer, 
    isHuman,
    totalPlayers 
}) => {
    // Ensure totalPlayers is a valid player count
    const validPlayerCount = totalPlayers as ValidPlayerCount;
    if (!(validPlayerCount in POSITION_LAYOUTS)) {
        console.error(`Invalid player count: ${totalPlayers}`);
        return null;
    }

    const positions = POSITION_LAYOUTS[validPlayerCount];
    const position = positions[player.position];

    return (
        <PlayerContainer 
            $position={player.position} 
            $totalPlayers={totalPlayers}
        >
            <PlayerDisplay $isHuman={isHuman}>
                {isDealer && <DealerBadge>D</DealerBadge>}
                <div className="name">{player.name}</div>
                <div className="stats">
                    {player.chips} chips
                    <br />
                    {player.cards.length} cards
                </div>
            </PlayerDisplay>
        </PlayerContainer>
    );
};

export default PlayerPosition; 