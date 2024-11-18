export type Card = {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    value: string;
    imageUrl: string;
};

export type FeedbackType = 'success' | 'error' | 'info';

export type AnimationType = {
    id: string;
    startPos: { x: number; y: number; rotation: number };
    endPos: { x: number; y: number; rotation: number };
    duration: number;
    card?: Card;
};

export type Player = {
    id: number;
    name: string;
    isHuman: boolean;
    chips: number;
    cards: Card[];
    aiDifficulty?: AIDifficulty;
    score: number;
    tricks: number;
    position: number;
    isDead?: boolean;
    deadInSuit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    currentBid?: number;
};

export type GamePhase = 
    | 'player-selection'
    | 'dealerBlindChoice'
    | 'blindAuction'
    | 'betting'
    | 'michigan'
    | 'hearts'
    | 'poker'
    | 'gameOver';

export type GameState = {
    players: Player[];
    currentPlayer: number;
    dealerId: number;
    deadHand?: Card[];
    pot: PotSection[];
    deck: Card[];
    phase: GamePhase;
    animations: AnimationType[];
    feedback?: {
        message: string;
        feedbackType: FeedbackType;
    };
    soundEnabled: boolean;
    currentTrick: Card[];
    highestBidder?: number;
    currentBid?: number;
};

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'cardShark';

export interface Position {
    x: number;
    y: number;
    rotation: number;
}

export type SectionLabel = 
    | 'Ten'
    | 'Jack'
    | 'Queen'
    | 'King'
    | 'Ace'
    | '8-9-10'
    | 'King-Queen'
    | 'POT'
    | 'Kitty';

export type SectionType = 
    | 'michigan'
    | 'hearts'
    | 'poker'
    | 'special';

export type Position = 
    | 'top'           // Ten
    | 'topRight'      // Jack
    | 'right'         // Queen
    | 'bottomRight'   // King
    | 'bottom'        // Ace
    | 'bottomLeft'    // 8-9-10
    | 'left'          // King-Queen
    | 'topLeft'       // Kitty
    | 'center';       // POT

export interface PotSection {
    label: SectionLabel;
    chips: number;
    position: Position;
    type?: SectionType;
    cards: Card[];
}

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type GameActionType = 
    | { type: 'START_GAME'; players: number; humanPosition: number }
    | { type: 'PLACE_BET'; playerId: number; amount: number; section: string }
    | { type: 'PLAY_CARD'; playerId: number; card: Card }
    | { type: 'NEXT_PHASE' }
    | { type: 'NEXT_PLAYER' }
    | { type: 'COLLECT_POT'; playerId: number; section: string }
    | { type: 'SET_AI_DIFFICULTY'; difficulty: AIDifficulty }
    | { type: 'EXECUTE_AI_TURN' }
    | { type: 'ADD_ANIMATION'; animation: Animation }
    | { type: 'REMOVE_ANIMATION'; id: string }
    | { type: 'CHANGE_PLAYER_NAME'; name: string }
    | { type: 'START_NEW_ROUND' }
    | { type: 'DEAL_CARDS'; deck: Card[] };

export type GameAction = 
    | { type: 'HANDLE_DEAD_HAND_DECISION'; takeHand: boolean }
    | { type: 'HANDLE_DEAD_HAND_BID'; winnerId: number; bidAmount: number }
    // ... other action types ... 