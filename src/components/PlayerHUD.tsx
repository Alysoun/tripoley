import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Card, Rank} from '../types/GameTypes';
import styled from 'styled-components';
import Chip from './Chip';
import BettingInterface from './BettingInterface';
import { CardPlayLogic } from '../game/CardPlayLogic';
import { useGameEffects } from '../hooks/useGameEffects';
import { soundManager } from '../utils/SoundEffects';
import { getCardFrontPath } from '../utils/cardAssets';
import { PLAYER_NAME_KEY } from '../constants/gameConstants';
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const HUDContainer = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 40px;
    max-height: 25vh;
    background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.95) 0%,
        rgba(0, 0, 0, 0.8) 80%,
        rgba(0, 0, 0, 0) 100%
    );
    color: white;
    backdrop-filter: blur(5px);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
`;

const PlayerInfo = styled.div`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 15px 25px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
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
`;

const ChipStack = styled.div`
    display: flex;
    gap: 5px;
    align-items: center;
`;

const ChipDisplay = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 10px;
    backdrop-filter: blur(5px);
`;

const ChipCount: React.FC<{ chips: number }> = ({ chips }) => {
    const denominations = [1000, 500, 100, 50, 25, 10, 5, 1];
    const chipCounts = new Map<number, number>();
    
    let remaining = chips;
    denominations.forEach(denom => {
        const count = Math.floor(remaining / denom);
        if (count > 0) {
            chipCounts.set(denom, count);
            remaining %= denom;
        }
    });

    return (
        <ChipDisplay>
            <span>Chips:</span>
            <ChipStack>
                {Array.from(chipCounts.entries()).map(([denom, count]) => (
                    <div key={denom} style={{ position: 'relative' }}>
                        <Chip value={denom} size="small" />
                        {count > 1 && (
                            <span style={{ 
                                position: 'absolute', 
                                top: -8, 
                                right: -8, 
                                background: '#ffd700',
                                color: 'black',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}>
                                {count}
                            </span>
                        )}
                    </div>
                ))}
            </ChipStack>
        </ChipDisplay>
    );
};

const DraggableCardContainer = styled.div`
    display: flex;
    gap: 10px;
    padding: 20px;
    min-height: 180px;
    justify-content: center;
    align-items: center;
`;

const CardWrapper = styled.div<{ $isPlayable: boolean; $isDragging?: boolean }>`
    position: relative;
    transition: transform 0.2s ease-out;
    transform-style: preserve-3d;
    user-select: none;
    touch-action: none;  // Important for touch devices

    &:hover {
        transform: ${props => !props.$isDragging && 
            (props.$isPlayable ? 'translateY(-30px) scale(1.1)' : 'translateY(-10px)')};
    }

    ${props => props.$isDragging && `
        transform: scale(1.1);
        cursor: grabbing;
    `}
`;

const CardImage = styled.img<{ $isPlayable: boolean }>`
    width: 100px;
    height: auto;
    cursor: ${props => props.$isPlayable ? 'pointer' : 'default'};
    filter: ${props => !props.$isPlayable && 'brightness(0.7)'};
    transition: filter 0.3s ease;
`;

const PhaseIndicator = styled.div`
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

const ActionButton = styled.button<{ $disabled?: boolean }>`
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

const NameEditContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    padding: 8px 12px;
    border-radius: 8px;
    backdrop-filter: blur(5px);
`;

const NameInput = styled.input`
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    padding: 4px 8px;
    font-size: 1em;
    width: 150px;

    &:focus {
        outline: none;
        border-color: rgba(255, 215, 0, 0.5);
        box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
    }
`;

const NameButton = styled.button`
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    color: white;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;

const PlayerName = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

const SortableCard = ({ card, index, isPlayable, onCardPlay }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `${card.suit}-${card.value}-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 1 : undefined,
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <CardWrapper
            ref={setNodeRef}
            style={style}
            $isPlayable={isPlayable}
            $isDragging={isDragging}
            {...attributes}
            {...listeners}
        >
            <CardImage
                id={`card-${card.suit}-${card.value}`}
                src={getCardFrontPath(card.suit, card.value as Rank)}
                alt={`${card.value} of ${card.suit}`}
                onClick={() => onCardPlay(card)}
                $isPlayable={isPlayable}
            />
        </CardWrapper>
    );
};

const PlayerHUD: React.FC = () => {
    const { state, dispatch } = useGame();
    console.log('All players:', state.players);
    const player = state.players.find(p => p.isHuman === true);
    
    // Add debug logging
    console.log('Loading from localStorage:', localStorage.getItem(PLAYER_NAME_KEY));
    const savedName = localStorage.getItem(PLAYER_NAME_KEY) || 'Human Player';
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(savedName);
    console.log('Found human player:', player);
    const [showBetting, setShowBetting] = useState(false);
    const { playCard, showFeedback } = useGameEffects();
    
    const isPlayerTurn = player && state.currentPlayer === player.position;

    const isCardPlayable = (card: Card): boolean => {
        if (!player || !isPlayerTurn) return false;
        const playableInfo = CardPlayLogic.isCardPlayable(card, player, state);
        return playableInfo.isPlayable;
    };

    const handleCardPlay = (card: Card) => {
        if (!player || !isCardPlayable(card)) {
            soundManager.play('error');
            showFeedback('Invalid move!', 'error');
            return;
        }

        const playEvaluation = CardPlayLogic.evaluatePlay(card, player, state);
        if (playEvaluation.isValid) {
            const cardElement = document.getElementById(`card-${card.suit}-${card.value}`);
            const startPos = cardElement?.getBoundingClientRect() || { x: 0, y: 0 };
            const endPos = { 
                x: window.innerWidth / 2, 
                y: window.innerHeight / 2,
                rotation: Math.random() * 360 
            };

            playCard(card, 
                { x: startPos.x, y: startPos.y, rotation: 0 },
                endPos
            );

            if (playEvaluation.points > 0) {
                soundManager.play('win');
                showFeedback(`Scored ${playEvaluation.points} points!`, 'success');
            }

            dispatch({ type: 'PLAY_CARD', playerId: player.id, card });
            dispatch({ type: 'NEXT_PLAYER' });
        }
    };

    const handleNameChange = () => {
        if (newName.trim()) {
            // Add debug logging
            console.log('Saving to localStorage:', newName.trim());
            localStorage.setItem(PLAYER_NAME_KEY, newName.trim());
            dispatch({ type: 'CHANGE_PLAYER_NAME', name: newName.trim() });
            setIsEditingName(false);
        }
    };

    // Make sure name is loaded on mount
    useEffect(() => {
        const savedName = localStorage.getItem(PLAYER_NAME_KEY);
        console.log('Initial load from localStorage:', savedName);
        if (savedName && player) {
            dispatch({ type: 'CHANGE_PLAYER_NAME', name: savedName });
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (!over || !player) return;

        if (active.id !== over.id) {
            const oldIndex = player.cards.findIndex((_, i) => 
                `${player.cards[i].suit}-${player.cards[i].value}-${i}` === active.id
            );
            const newIndex = player.cards.findIndex((_, i) => 
                `${player.cards[i].suit}-${player.cards[i].value}-${i}` === over.id
            );

            dispatch({
                type: 'REORDER_CARDS',
                playerId: player.id,
                cards: arrayMove(player.cards, oldIndex, newIndex)
            });
        }
    };

    const getActionButton = () => {
        if (!isPlayerTurn) return null;

        switch (state.phase) {
            case 'kittyBetting':
                return (
                    <ActionButton 
                        onClick={() => setShowBetting(true)}
                    >
                        Bid for Kitty
                    </ActionButton>
                );
            case 'betting':
                return (
                    <ActionButton 
                        onClick={() => setShowBetting(true)}
                    >
                        Place Bets
                    </ActionButton>
                );
            case 'poker':
                return (
                    <>
                        <ActionButton onClick={() => handlePokerAction('call')}>
                            Call
                        </ActionButton>
                        <ActionButton onClick={() => handlePokerAction('raise')}>
                            Raise
                        </ActionButton>
                        <ActionButton onClick={() => handlePokerAction('fold')}>
                            Fold
                        </ActionButton>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <HUDContainer>
                <PlayerInfo>
                    {isEditingName ? (
                        <NameEditContainer>
                            <NameInput
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleNameChange()}
                                autoFocus
                            />
                            <NameButton onClick={handleNameChange}>
                                ✓
                            </NameButton>
                        </NameEditContainer>
                    ) : (
                        <PlayerName onClick={() => setIsEditingName(true)}>
                            {player?.name} <span style={{ opacity: 0.6 }}>✎</span>
                        </PlayerName>
                    )}
                    <ChipCount chips={player?.chips || 0} />
                    <PhaseIndicator>Phase: {state.phase}</PhaseIndicator>
                    {getActionButton()}
                </PlayerInfo>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={player?.cards?.map((card, i) => `${card.suit}-${card.value}-${i}`) || []}
                        strategy={horizontalListSortingStrategy}
                    >
                        <DraggableCardContainer>
                            {player?.cards?.map((card, index) => (
                                <SortableCard
                                    key={`${card.suit}-${card.value}-${index}`}
                                    card={card}
                                    index={index}
                                    isPlayable={isCardPlayable(card)}
                                    onCardPlay={handleCardPlay}
                                />
                            ))}
                        </DraggableCardContainer>
                    </SortableContext>
                </DndContext>
            </HUDContainer>
            {showBetting && (
                <BettingInterface onClose={() => setShowBetting(false)} />
            )}
        </>
    );
};

export default PlayerHUD; 