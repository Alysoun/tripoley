import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import TripoleyPot from './TripoleyPot';
import PlayerHUD from './PlayerHUD';
import CardAnimation from './CardAnimation';
import { useGameEffects } from '../hooks/useGameEffects';
import { soundManager } from '../utils/SoundEffects';
import PlayerSelect from './PlayerSelect';
import { getCardBackPath } from '../utils/cardAssets';
import PlayerPosition from './PlayerPosition';
import { PlayerPositionEditor } from './dev/PlayerPositionEditor';
import { PotSection } from '../types/GameTypes';
import BlindAuctionModal from './BlindAuctionModal';

type Position = {
    left: string;
    top: string;
};

const TableContainer = styled.div`
    width: 100vw;
    height: 100vh;
    background: #1b472b;
    position: relative;
    overflow: hidden;
`;

const TableFelt = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    height: 90%;
    background: #2a653d;
    border-radius: 200px;
    box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const PhaseIndicator = styled.div`
    position: fixed;
    top: 20px;
    right: 80px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    z-index: 10;
`;

const AnimationLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1000;
`;

const SoundToggle = styled.button`
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.7);
        transform: scale(1.1);
    }
`;

const DeadHandDisplay = styled.div`
    position: absolute;
    bottom: 200px;
    right: -50px;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 8px;
    color: white;
    text-align: center;
    z-index: 10;
`;

const CardCount = styled.div`
    font-size: 0.9em;
    opacity: 0.8;
    margin-top: 4px;
`;

const CardStack = styled.div`
    position: relative;
    width: 100px;
    height: 140px;
    margin: 0 auto;
    transform: rotate(-10deg);
`;

const GameTable: React.FC = () => {
    const { state, dispatch } = useGame();
    const { toggleSound, isSoundEnabled } = useGameEffects();
    const isGameStarted = state?.players?.length > 0;
    const [showPositionEditor, setShowPositionEditor] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showBlindAuction, setShowBlindAuction] = useState(false);

    console.log('GameTable render, showPositionEditor:', showPositionEditor);

    const handleStartGame = (playerCount: number) => {
        soundManager.play('shuffle');
        dispatch({ 
            type: 'START_GAME', 
            players: playerCount,
            humanPosition: 0 
        });
    };

    const handleSavePositions = (positions: Record<number, Position[]>) => {
        console.log('handleSavePositions called with:', positions);
        localStorage.setItem('playerPositions', JSON.stringify(positions));
        setShowPositionEditor(false);
    };

    // Only show PlayerHUD and players when not in player selection
    const shouldShowGameElements = state.phase !== 'player-selection';

    // Only show in development mode
    const devModeButton = process.env.NODE_ENV === 'development' && (
        <button 
            onClick={() => setShowPositionEditor(true)}
            style={{ 
                position: 'fixed', 
                top: '10px', 
                left: '10px',
                zIndex: 1000,
                padding: '8px',
                background: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
            }}
        >
            Edit Positions
        </button>
    );

    // Find the human player
    const humanPlayer = state.players.find(p => p.isHuman);
    const isHumanDealer = humanPlayer?.id === state.dealerId;

    useEffect(() => {
        console.log('GameTable Effect - Detailed State:', {
            phase: state.phase,
            isHumanDealer,
            showBlindAuction,
            dealerId: state.dealerId,
            currentPlayer: state.currentPlayer,
            humanPlayer
        });
        
        // Show modal when it's the dealer's turn to make blind choice
        if (state.phase === 'dealerBlindChoice' && isHumanDealer) {
            console.log('Should show blind auction modal - conditions met');
            setShowBlindAuction(true);
        }
    }, [state.phase, isHumanDealer, state.dealerId, humanPlayer]);

    // Prevent auto-closing the modal
    useEffect(() => {
        if (state.phase !== 'dealerBlindChoice') {
            setShowBlindAuction(false);
        }
    }, [state.phase]);

    return (
        <TableContainer>
            {devModeButton}
            <button 
                style={{ position: 'fixed', top: '50px', left: '10px', zIndex: 1000 }}
                onClick={() => setIsEditMode(!isEditMode)}
            >
                {isEditMode ? 'Save Positions' : 'Edit Positions'}
            </button>
            {showPositionEditor && (
                <PlayerPositionEditor
                    onSave={handleSavePositions}
                    onClose={() => setShowPositionEditor(false)}
                />
            )}
            {shouldShowGameElements && (
                <>
                    {state.players.map((player) => (
                        <PlayerPosition
                            key={player.id}
                            player={player}
                            isDealer={player.id === state.dealerId}
                            isHuman={player.isHuman}
                            totalPlayers={state.players.length}
                        />
                    ))}
                    <PlayerHUD />
                </>
            )}

            <TableFelt>
                {!isGameStarted ? (
                    <PlayerSelect onStart={handleStartGame} />
                ) : (
                    <>
                        <PhaseIndicator>
                            Phase: {state.phase}
                        </PhaseIndicator>
                        <TripoleyPot 
                            sections={state.pot as PotSection[]}
                            onSectionClick={() => {
                                soundManager.play('chipMove');
                            }}
                            isEditMode={isEditMode}
                        />
                        {state.players.map((player) => (
                            <PlayerPosition
                                key={player.id}
                                player={player}
                                isDealer={player.id === state.dealerId}
                                isHuman={player.isHuman}
                                totalPlayers={state.players.length}
                            />
                        ))}
                        {state.deadHand && (
                            <DeadHandDisplay>
                                <div>Dead Hand</div>
                                <CardStack>
                                    {state.deadHand.map((_, index) => (
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
                                <CardCount>{state.deadHand.length} cards</CardCount>
                            </DeadHandDisplay>
                        )}
                    </>
                )}
    
                <AnimationLayer>
                    {state.animations?.filter(animation => animation.card).map(animation => (
                        <CardAnimation
                            key={animation.id}
                            {...animation}
                            onComplete={() => dispatch({ type: 'REMOVE_ANIMATION', id: animation.id })}
                        />
                    ))}
                </AnimationLayer>
    
                <SoundToggle onClick={toggleSound}>
                    {isSoundEnabled ? '🔊' : '🔇'}
                </SoundToggle>
            </TableFelt>
    
            <PlayerHUD />

            {showBlindAuction && isHumanDealer && state.phase === 'dealerBlindChoice' && (
                <BlindAuctionModal 
                    onClose={() => {
                        console.log('Closing blind auction modal');
                        setShowBlindAuction(false);
                    }}
                    isDealer={true}
                />
            )}
        </TableContainer>
    );
};

export default GameTable; 