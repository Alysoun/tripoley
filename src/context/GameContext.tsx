import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, Card, AIDifficulty, PotSection, SectionLabel } from '../types/GameTypes';
import { soundManager } from '../utils/SoundEffects';
import { AIPlayer } from '../ai/AILogic';
import { generateName } from '../utils/nameGenerator';
import { PLAYER_NAME_KEY } from '../constants/gameConstants';

// Define action types
type GameAction = 
    | { type: 'START_GAME'; players: number; humanPosition: number }
    | { type: 'PLACE_BET'; playerId: number; amount: number; potSection: string }
    | { type: 'PLAY_CARD'; playerId: number; card: Card }
    | { type: 'NEXT_PHASE' }
    | { type: 'NEXT_PLAYER' }
    | { type: 'COLLECT_POT'; playerId: number; potSection: string }
    | { type: 'SET_AI_DIFFICULTY'; playerId: number; difficulty: AIDifficulty }
    | { type: 'EXECUTE_AI_TURN' }
    | { type: 'ADD_ANIMATION'; animation: AnimationType }
    | { type: 'REMOVE_ANIMATION'; id: string }
    | { type: 'TOGGLE_SOUND' }
    | { type: 'SHOW_FEEDBACK'; message: string; feedbackType: 'success' | 'error' | 'info' }
    | { type: 'TAKE_DEAD_HAND'; playerId: number }
    | { type: 'START_DEAD_HAND_BIDDING' }
    | { type: 'PLACE_DEAD_HAND_BID'; playerId: number; amount: number }
    | { type: 'PASS_DEAD_HAND_BID'; playerId: number }
    | { type: 'ROTATE_DEALER' }
    | { type: 'CHANGE_PLAYER_NAME'; name: string }
    | { type: 'START_NEW_ROUND' }
    | { type: 'REORDER_CARDS'; playerId: number; cards: Card[] }
    | { 
        type: 'PLACE_BETS'; 
        playerId: number; 
        bets: { 
            michigan: number; 
            hearts: number; 
            poker: number; 
        }; 
    }
    | { type: 'DEALER_BLIND_CHOICE'; choice: 'swap' | 'auction' | 'keep' }
    | { type: 'BID_FOR_BLIND'; playerId: number; amount: number };

// Add AnimationType interface near the top of the file
type AnimationType = {
    id: string;
    type: 'cardMove' | 'chipMove';
    startPos: { x: number; y: number; rotation: number };
    endPos: { x: number; y: number; rotation: number };
    duration: number;
};

// Initial game state
const initialGameState: GameState = {
    players: [],
    currentPlayer: 0,
    dealerId: 0,
    pot: [
        { label: "KITTY" as SectionLabel, position: { x: 400, y: 200 }, chips: 0, cards: [] },
        { label: "MICHIGAN" as SectionLabel, position: { x: 200, y: 200 }, chips: 0, cards: [] },
        { label: "HEARTS" as SectionLabel, position: { x: 600, y: 200 }, chips: 0, cards: [] },
        { label: "POKER" as SectionLabel, position: { x: 400, y: 400 }, chips: 0, cards: [] }
    ],
    deck: [],
    phase: 'dealerBlindChoice',
    animations: [],
    soundEnabled: true,
    currentTrick: [],
    needsDealerBlindChoice: true
};

// Create context
const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
} | undefined>(undefined);

// Add the shuffleDeck function
function shuffleDeck(deck: Card[]): Card[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

function createDeck(): Card[] {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
    const deck: Card[] = [];

    const valueMap: { [key: string]: string } = {
        'A': 'ace',
        'K': 'king',
        'Q': 'queen',
        'J': 'jack',
    };

    for (const suit of suits) {
        for (const value of values) {
            deck.push({
                suit,
                value,
                imageUrl: `/src/components/cards/fronts/${suit.toLowerCase()}_${
                    valueMap[value] || value.toLowerCase()
                }.svg`
            });
        }
    }

    return shuffleDeck(deck);
}

// Game reducer
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME': {
            const deck = shuffleDeck(createDeck());
            const numPlayers = action.players;
            const dealerId = Math.floor(Math.random() * numPlayers);
            
            // Calculate base cards per player (including dead hand) and remainder
            const totalPositions = numPlayers + 1; // players + dead hand
            const baseCardsPerPosition = Math.floor(52 / totalPositions);
            const extraCards = 52 % totalPositions;
            
            console.log('Total positions (including dead hand):', totalPositions);
            console.log('Dealer ID:', dealerId);
            console.log(`Base cards per position: ${baseCardsPerPosition}`);
            console.log(`Extra cards to distribute: ${extraCards}`);

            // Deal the dead hand first (base cards + extra if it's first position)
            const deadHandSize = baseCardsPerPosition;
            const deadHand = deck.slice(0, deadHandSize);
            let currentDeckIndex = deadHandSize;

            // Create players array with correct card distribution
            const players: Player[] = Array.from({ length: numPlayers }, (_, i) => {
                // Calculate position relative to dealer
                const positionFromDealer = (i - dealerId + numPlayers) % numPlayers;
                // Players left of dealer (positions 1 to remaining extraCards) get an extra card
                const extraCard = positionFromDealer > 0 && positionFromDealer <= extraCards ? 1 : 0;
                const cardCount = baseCardsPerPosition + extraCard;
                
                console.log(`Player ${i} (position ${positionFromDealer} from dealer) gets ${cardCount} cards`);
                
                const playerCards = deck.slice(
                    currentDeckIndex, 
                    currentDeckIndex + cardCount
                );
                currentDeckIndex += cardCount;

                const savedName = localStorage.getItem(PLAYER_NAME_KEY);
                return {
                    id: i,
                    name: i === action.humanPosition ? 
                          (savedName || 'Human Player') : 
                          generateName(),
                    isHuman: i === action.humanPosition,
                    chips: 100,
                    cards: playerCards,
                    aiDifficulty: i === action.humanPosition ? undefined : 'medium',
                    score: 0,
                    tricks: 0,
                    position: i
                };
            });

            const initialPot: PotSection[] = [
                { label: 'Ten', chips: 0, position: 'top', cards: [] },
                { label: 'Jack', chips: 0, position: 'topRight', cards: [] },
                { label: 'Queen', chips: 0, position: 'right', cards: [] },
                { label: 'King', chips: 0, position: 'bottomRight', cards: [] },
                { label: 'Ace', chips: 0, position: 'bottom', cards: [] },
                { label: '8-9-10', chips: 0, position: 'bottomLeft', cards: [] },
                { label: 'King-Queen', chips: 0, position: 'left', cards: [] },
                { label: 'Kitty', chips: 0, position: 'topLeft', cards: [] },
                { label: 'POT', chips: 0, position: 'center', cards: [] }
            ];

            return {
                ...state,
                players,
                dealerId,
                deadHand,
                currentPlayer: (dealerId + 1) % numPlayers,
                phase: 'betting',
                currentTrick: [],
                pot: initialPot
            };
        }

        case 'PLACE_BET':
            return {
                ...state,
                players: state.players.map(player =>
                    player.id === action.playerId
                        ? { ...player, chips: player.chips - action.amount }
                        : player
                ),
                pot: state.pot.map(section =>
                    section.label === action.potSection
                        ? { ...section, chips: section.chips + action.amount }
                        : section
                )
            };

        case 'PLAY_CARD':
            return playCard(state, action.playerId, action.card);

        case 'NEXT_PHASE':
            return {
                ...state,
                phase: getNextPhase(state.phase),
                currentPlayer: 0
            };

        case 'NEXT_PLAYER':
            return {
                ...state,
                currentPlayer: (state.currentPlayer + 1) % state.players.length
            };

        case 'COLLECT_POT':
            return collectPot(state, action.playerId, action.potSection);

        case 'SET_AI_DIFFICULTY':
            return {
                ...state,
                players: state.players.map(player =>
                    player.id === action.playerId
                        ? { ...player, aiDifficulty: action.difficulty }
                        : player
                )
            };

        case 'EXECUTE_AI_TURN': {
            const currentPlayer = state.players[state.currentPlayer];
            console.log('AI Turn - Current Player:', currentPlayer);
            console.log('Current Phase:', state.phase);
            
            if (!currentPlayer || currentPlayer.isHuman) {
                console.log('Not an AI player, skipping turn');
                return state;
            }

            if (state.phase === 'dealerBlindChoice' && currentPlayer.id === state.dealerId) {
                console.log('AI Dealer making blind choice');
                const choice = AIPlayer.decideBlindChoice(currentPlayer, state);
                console.log('AI Dealer chose:', choice);
                return gameReducer(state, { 
                    type: 'DEALER_BLIND_CHOICE', 
                    choice 
                });
            }

            if (state.phase === 'blindAuction') {
                console.log('AI participating in blind auction');
                const currentBid = Math.max(...state.players.map(p => p.currentBid || 0));
                console.log('Current highest bid:', currentBid);
                const bid = AIPlayer.decideBlindBid(currentPlayer, state, currentBid);
                console.log('AI decided to bid:', bid);
                
                if (bid > 0) {
                    return gameReducer(state, {
                        type: 'BID_FOR_BLIND',
                        playerId: currentPlayer.id,
                        amount: bid
                    });
                } else {
                    console.log('AI passed on bidding');
                    return {
                        ...state,
                        currentPlayer: (state.currentPlayer + 1) % state.players.length
                    };
                }
            }

            console.log('AI turn - no action taken');
            return state;
        }

        case 'ADD_ANIMATION':
            return {
                ...state,
                animations: [...state.animations, action.animation]
            };

        case 'REMOVE_ANIMATION':
            return {
                ...state,
                animations: state.animations.filter(a => a.id !== action.id)
            };

        case 'TOGGLE_SOUND':
            soundManager.setEnabled(!soundManager.isEnabled());
            return {
                ...state,
                soundEnabled: !state.soundEnabled
            };

        case 'SHOW_FEEDBACK':
            return {
                ...state,
                feedback: {
                    message: action.message,
                    feedbackType: action.feedbackType
                }
            };

        case 'TAKE_DEAD_HAND': {
            const player = state.players[action.playerId];
            const playerOldHand = [...player.cards];
            
            return {
                ...state,
                players: state.players.map(p => 
                    p.id === action.playerId
                        ? { ...p, cards: state.deadHand || [] }
                        : p
                ),
                deadHand: playerOldHand,
                phase: 'betting'  // Move to betting phase
            };
        }

        case 'START_DEAD_HAND_BIDDING': {
            return {
                ...state,
                currentPlayer: (state.dealerId + 1) % state.players.length  // Start with player after dealer
            };
        }

        case 'PLACE_DEAD_HAND_BID': {
            // Handle bid logic
            return {
                ...state,
                currentPlayer: (state.currentPlayer + 1) % state.players.length
            };
        }

        case 'PASS_DEAD_HAND_BID': {
            // Check if everyone has passed except highest bidder
            // If so, give dead hand to highest bidder
            return {
                ...state,
                currentPlayer: (state.currentPlayer + 1) % state.players.length
            };
        }

        case 'ROTATE_DEALER': {
            return {
                ...state,
                dealerId: (state.dealerId + 1) % state.players.length,
                currentPlayer: (state.dealerId + 1) % state.players.length  // Start with new dealer
            };
        }

        case 'START_NEW_ROUND': {
            const newDealerId = (state.dealerId + 1) % state.players.length;
            const deck = shuffleDeck(createDeck());
            
            return {
                ...state,
                dealerId: newDealerId,
                currentPlayer: (newDealerId + 1) % state.players.length,
                deck: deck,
                phase: 'betting',
                currentTrick: [],
                pot: state.pot.map(section => ({ ...section, chips: 0, cards: [] }))
            };
        }

        case 'CHANGE_PLAYER_NAME': {
            const newState = {
                ...state,
                players: state.players.map(p => 
                    p.isHuman ? { ...p, name: action.name } : p
                )
            };
            return newState;
        }

        case 'DEAL_CARDS': {
            console.log('Dealing cards...');
            const deck = shuffleDeck();
            const playerCount = state.players.length;
            const dealerId = state.dealerId ?? 0;
            
            // Dead hand always gets 5 cards
            const deadHand = deck.splice(0, 5);
            
            // Calculate base cards per player and remainder
            const remainingCards = deck.length;
            const baseCardsPerPlayer = Math.floor(remainingCards / playerCount);
            const extraCards = remainingCards % playerCount;
            
            const updatedPlayers = state.players.map((player, index) => {
                // Calculate position relative to dealer
                const positionFromDealer = (index - dealerId + playerCount) % playerCount;
                // Players left of dealer get extra cards if available
                const extraCard = positionFromDealer > 0 && positionFromDealer <= extraCards ? 1 : 0;
                const cardCount = baseCardsPerPlayer + extraCard;
                
                return {
                    ...player,
                    cards: deck.splice(0, cardCount)
                };
            });

            return {
                ...state,
                players: updatedPlayers,
                deadHand,
                deck: deck,
                phase: 'dealerBlindChoice',
                needsDealerBlindChoice: true
            };
        }

        case 'REORDER_CARDS':
            return {
                ...state,
                players: state.players.map(p => 
                    p.id === action.playerId 
                        ? { ...p, cards: action.cards }
                        : p
                )
            };

        case 'PLACE_BETS':
            return {
                ...state,
                players: state.players.map(player => 
                    player.id === action.playerId
                        ? {
                            ...player,
                            chips: player.chips - Object.values(action.bets).reduce((sum, bet) => sum + bet, 0),
                            bets: action.bets
                        }
                        : player
                ),
                pot: state.pot.map(section => {
                    if (section.label === 'Ten' || section.label === 'Jack' || section.label === 'Queen') {
                        return { ...section, chips: section.chips + action.bets.michigan };
                    }
                    if (section.label === 'King' || section.label === 'Ace') {
                        return { ...section, chips: section.chips + action.bets.hearts };
                    }
                    if (section.label === '8-9-10' || section.label === 'King-Queen') {
                        return { ...section, chips: section.chips + action.bets.poker };
                    }
                    return section;
                })
            };

        case 'DEALER_BLIND_CHOICE': {
            console.log('Processing dealer blind choice:', action.choice);
            
            switch (action.choice) {
                case 'swap':
                    return {
                        ...state,
                        players: state.players.map(p => 
                            p.id === state.dealerId
                                ? { ...p, cards: state.deadHand }
                                : p
                        ),
                        deadHand: state.players.find(p => p.id === state.dealerId)?.cards || [],
                        phase: 'betting',
                        needsDealerBlindChoice: false
                    };
                case 'auction':
                    return {
                        ...state,
                        phase: 'blindAuction',
                        needsDealerBlindChoice: false
                    };
                case 'keep':
                    return {
                        ...state,
                        phase: 'betting',
                        needsDealerBlindChoice: false
                    };
                default:
                    return state;
            }
        }

        case 'BID_FOR_BLIND':
            return {
                ...state,
                players: state.players.map(p => 
                    p.id === action.playerId
                        ? { 
                            ...p, 
                            cards: state.deadHand,
                            chips: p.chips - action.amount 
                        }
                        : p
                ),
                deadHand: state.players.find(p => p.id === action.playerId)?.cards || [],
                phase: 'betting'
            };

        default:
            return state;
    }
}

// Helper functions
function getNextPhase(currentPhase: GameState['phase']): GameState['phase'] {
    const phases: GameState['phase'][] = ['betting', 'michigan', 'hearts', 'poker'];
    const currentIndex = phases.indexOf(currentPhase);
    return phases[(currentIndex + 1) % phases.length];
}

function playCard(state: GameState, playerId: number, card: Card): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId
                ? { ...p, cards: p.cards.filter(c => c !== card) }
                : p
        )
    };
}

function collectPot(state: GameState, playerId: number, potSection: string): GameState {
    const section = state.pot.find(s => s.label === potSection);
    if (!section) return state;

    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId
                ? { ...p, chips: p.chips + section.chips }
                : p
        ),
        pot: state.pot.map(s =>
            s.label === potSection
                ? { ...s, chips: 0 }
                : s
        )
    };
}

function dealCards(state: GameState, deck: Card[]): GameState {
    // Your dealing logic here
    return {
        ...state,
        // Update with dealt cards
    };
}

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialGameState);

    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
}

// Custom hook to use the game context
export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
