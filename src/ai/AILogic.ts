import { Player, Card, GameState, AIDifficulty } from '../types/GameTypes';

interface AIDecision {
    action: 'bet' | 'play';
    card?: Card;
    betAmount?: number;
    potSection?: string;
}

// Base betting amounts by difficulty
const BASE_BET_AMOUNTS = {
    easy: 1,
    medium: 2,
    hard: 3,
    cardShark: 5
};

// Add these new interfaces and types
interface AIPersonality {
    aggression: number;      // 0-1: How aggressively the AI bets
    bluffing: number;        // 0-1: Likelihood to bluff
    consistency: number;     // 0-1: How consistently it plays optimally
    adaptation: number;      // 0-1: How well it adapts to other players' strategies
}

// Add personality traits based on difficulty
const AI_PERSONALITIES: Record<AIDifficulty, AIPersonality> = {
    easy: {
        aggression: 0.2,
        bluffing: 0.1,
        consistency: 0.3,
        adaptation: 0.2
    },
    medium: {
        aggression: 0.5,
        bluffing: 0.4,
        consistency: 0.6,
        adaptation: 0.5
    },
    hard: {
        aggression: 0.8,
        bluffing: 0.7,
        consistency: 0.85,
        adaptation: 0.8
    },
    cardShark: {
        aggression: 0.9,
        bluffing: 0.9,
        consistency: 0.95,
        adaptation: 0.95
    }
};

// Add these new types and constants
interface HandEvaluation {
    strength: number;        // 0-1 score of hand strength
    playableCards: Card[];   // Cards that could be played
    bestPlay: Card | null;   // Best card to play
    confidence: number;      // 0-1 confidence in the evaluation
}

// Precomputed card values for quick lookup
const CARD_VALUES: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Memory of recent plays for pattern recognition
const MEMORY_SIZE = 10;
class AIMemory {
    private static memory: Map<number, {
        lastPlays: Card[];
        successfulBets: { amount: number; section: string }[];
        winningMoves: Card[];
    }> = new Map();

    static recordPlay(playerId: number, card: Card, wasSuccessful: boolean) {
        const playerMemory = this.getPlayerMemory(playerId);
        playerMemory.lastPlays = [card, ...playerMemory.lastPlays].slice(0, MEMORY_SIZE);
        if (wasSuccessful) {
            playerMemory.winningMoves = [card, ...playerMemory.winningMoves].slice(0, MEMORY_SIZE);
        }
    }

    static recordBet(playerId: number, amount: number, section: string, wasSuccessful: boolean) {
        if (wasSuccessful) {
            const playerMemory = this.getPlayerMemory(playerId);
            playerMemory.successfulBets = [{ amount, section }, ...playerMemory.successfulBets].slice(0, MEMORY_SIZE);
        }
    }

    public static getPlayerMemory(playerId: number) {
        if (!this.memory.has(playerId)) {
            this.memory.set(playerId, {
                lastPlays: [],
                successfulBets: [],
                winningMoves: []
            });
        }
        return this.memory.get(playerId)!;
    }
}

export class AIPlayer {
    static makeDecision(
        player: Player,
        gameState: GameState,
        phase: GameState['phase']
    ): AIDecision {
        if (!player.aiDifficulty) {
            throw new Error('AI difficulty not set for player');
        }

        // Use cached evaluations when possible
        const handEval = this.evaluateHand(player.cards, gameState, phase);
        const personality = AI_PERSONALITIES[player.aiDifficulty!];

        // Quick decision based on personality and hand evaluation
        if (Math.random() > personality.consistency) {
            return this.makeRandomDecision(handEval);
        }

        // Consider recent successful plays
        const memory = AIMemory.getPlayerMemory(player.id);
        const hasSuccessPattern = this.detectSuccessPattern(memory);

        if (hasSuccessPattern && Math.random() < personality.adaptation) {
            return this.makePatternBasedDecision(memory);
        }

        // Make strategic decision
        return this.makeStrategicDecision(player, gameState, handEval, personality);
    }

    private static getPlayableCards(cards: Card[], gameState: GameState): Card[] {
        return cards.filter(card => this.isCardPlayable(card, gameState));
    }

    private static isCardPlayable(card: Card, gameState: GameState): boolean {
        if (!gameState.currentTrick?.length) return true;
        const leadSuit = gameState.currentTrick[0].suit;
        return card.suit === leadSuit || !this.hasMatchingSuit(gameState.players[gameState.currentPlayer].cards, leadSuit);
    }

    private static hasMatchingSuit(cards: Card[], suit: string): boolean {
        return cards.some(card => card.suit === suit);
    }

    private static evaluateHand(
        cards: Card[],
        gameState: GameState,
        phase: GameState['phase']
    ): HandEvaluation {
        switch (phase) {
            case 'michigan':
                return this.evaluateMichiganHand(cards);
            case 'hearts':
                return this.evaluateHeartsHand(cards);
            case 'poker':
                return this.evaluatePokerHand(cards, gameState);
            default:
                return this.evaluateGenericHand(cards);
        }
    }

    private static evaluatePokerHand(cards: Card[], gameState: GameState): HandEvaluation {
        const playableCards = this.getPlayableCards(cards, gameState);
        return {
            strength: 0.5,
            playableCards,
            bestPlay: playableCards[0],
            confidence: 0.6
        };
    }

    private static makeStrategicDecision(
        player: Player,
        gameState: GameState,
        handEval: HandEvaluation,
        personality: AIPersonality
    ): AIDecision {
        const isLatePosition = this.hasGoodPosition(player, gameState);
        const shouldBluff = this.shouldBluff(player, gameState);

        const adjustedConfidence = handEval.confidence * 
            (isLatePosition ? 1.2 : 0.8) * 
            (shouldBluff ? 0.7 : 1);

        if (gameState.phase === 'betting') {
            return {
                action: 'bet',
                betAmount: Math.floor(
                    BASE_BET_AMOUNTS[player.aiDifficulty!] * 
                    adjustedConfidence * 
                    personality.aggression
                ),
                potSection: this.selectBestPotSection(gameState)
            };
        }

        return {
            action: 'play',
            card: handEval.bestPlay || handEval.playableCards[0]
        };
    }

    private static makeRandomDecision(handEval: HandEvaluation): AIDecision {
        return {
            action: 'play',
            card: handEval.bestPlay || handEval.playableCards[0]
        };
    }

    private static makePatternBasedDecision(memory: any): AIDecision {
        return {
            action: 'play',
            card: memory.winningMoves[0]
        };
    }

    private static evaluateMichiganHand(cards: Card[]): HandEvaluation {
        const playableCards = cards;
        return {
            strength: 0.5,
            playableCards,
            bestPlay: playableCards[0],
            confidence: 0.6
        };
    }

    private static evaluateHeartsHand(cards: Card[]): HandEvaluation {
        return {
            strength: 0.5,
            playableCards: cards,
            bestPlay: cards[0],
            confidence: 0.5
        };
    }

    private static selectBestPotSection(gameState: GameState): string {
        return gameState.pot[0]?.label || '';
    }

    private static evaluateGenericHand(cards: Card[]): HandEvaluation {
        return {
            strength: 0.5,
            playableCards: cards,
            bestPlay: cards[0],
            confidence: 0.5
        };
    }

    private static shouldBluff(player: Player, gameState: GameState): boolean {
        const personality = AI_PERSONALITIES[player.aiDifficulty!];
        const bluffThreshold = personality.bluffing;
        
        // Consider factors that might influence bluffing
        const isLowOnChips = player.chips < 20;
        const isLeading = this.isPlayerLeading(player, gameState);
        const hasGoodPosition = this.hasGoodPosition(player, gameState);
        
        return Math.random() < bluffThreshold * 
            (isLowOnChips ? 1.2 : 1) * 
            (isLeading ? 0.8 : 1.2) * 
            (hasGoodPosition ? 1.3 : 0.9);
    }

    private static isPlayerLeading(player: Player, gameState: GameState): boolean {
        const averageChips = gameState.players.reduce((sum, p) => sum + p.chips, 0) / gameState.players.length;
        return player.chips > averageChips;
    }

    private static hasGoodPosition(player: Player, gameState: GameState): boolean {
        const position = gameState.players.findIndex(p => p.id === player.id);
        const totalPlayers = gameState.players.length;
        return position > totalPlayers / 2; // Later positions are generally better
    }

    private static detectSuccessPattern(memory: {
        winningMoves: Card[];
    }): boolean {
        const recentWins = memory.winningMoves.slice(0, 3);
        if (recentWins.length < 2) return false;

        return recentWins.every((card: Card, i: number, arr: Card[]) => 
            i === 0 || card.suit === arr[i-1].suit || 
            Math.abs(CARD_VALUES[card.value] - CARD_VALUES[arr[i-1].value]) === 1
        );
    }

    static decideBets(player: Player, gameState: GameState): {
        michigan: number;
        hearts: number;
        poker: number;
    } {
        const personality = AI_PERSONALITIES[player.aiDifficulty || 'medium'];
        const baseBet = BASE_BET_AMOUNTS[player.aiDifficulty || 'medium'];
        
        // Calculate available chips for betting
        const maxBet = Math.floor(player.chips * personality.aggression);
        
        // Analyze cards for each betting section
        const michiganCards = player.cards.filter(card => 
            ['Ten', 'Jack', 'Queen'].includes(card.value));
        const heartsCards = player.cards.filter(card => 
            ['King', 'Ace'].includes(card.value));
        const pokerCards = player.cards.filter(card => 
            ['8', '9', '10', 'King', 'Queen'].includes(card.value));

        // Calculate bet amounts based on cards held
        const michiganBet = this.calculateSectionBet(
            michiganCards.length,
            3,  // max possible michigan cards
            baseBet,
            maxBet,
            personality
        );

        const heartsBet = this.calculateSectionBet(
            heartsCards.length,
            2,  // max possible hearts cards
            baseBet,
            maxBet,
            personality
        );

        const pokerBet = this.calculateSectionBet(
            pokerCards.length,
            5,  // max possible poker cards
            baseBet,
            maxBet,
            personality
        );

        return {
            michigan: michiganBet,
            hearts: heartsBet,
            poker: pokerBet
        };
    }

    private static calculateSectionBet(
        cardsHeld: number,
        maxCards: number,
        baseBet: number,
        maxBet: number,
        personality: AIPersonality
    ): number {
        // Calculate confidence based on cards held and personality
        const cardConfidence = cardsHeld / maxCards;
        const bluffFactor = Math.random() < personality.bluffing ? 
            personality.aggression : 0;
        
        // Combine real confidence with potential bluffing
        const totalConfidence = (cardConfidence + bluffFactor) * personality.consistency;
        
        // Calculate bet amount
        let betAmount = Math.floor(baseBet + (maxBet * totalConfidence));
        
        // Add some randomness based on personality
        const randomFactor = 1 + ((Math.random() - 0.5) * (1 - personality.consistency));
        betAmount = Math.floor(betAmount * randomFactor);
        
        // Ensure bet is within valid range
        return Math.min(Math.max(0, betAmount), maxBet);
    }

    static decideBlindChoice(player: Player, gameState: GameState): 'swap' | 'auction' | 'keep' {
        console.log('AI analyzing hand for blind choice');
        const personality = AI_PERSONALITIES[player.aiDifficulty || 'medium'];
        console.log('AI Personality:', personality);
        
        // Analyze current hand strength
        const michiganCards = player.cards.filter(card => 
            ['Ten', 'Jack', 'Queen'].includes(card.value)).length;
        const heartsCards = player.cards.filter(card => 
            ['King', 'Ace'].includes(card.value)).length;
        const pokerCards = player.cards.filter(card => 
            ['8', '9', '10', 'King', 'Queen'].includes(card.value)).length;
        
        console.log('Hand analysis:', {
            michiganCards,
            heartsCards,
            pokerCards
        });

        const handStrength = (
            (michiganCards / 3) + 
            (heartsCards / 2) + 
            (pokerCards / 5)
        ) / 3;

        console.log('Calculated hand strength:', handStrength);

        // Add some randomness based on personality
        const randomFactor = Math.random() * (1 - personality.consistency);
        const adjustedStrength = handStrength + randomFactor;
        console.log('Adjusted strength with randomness:', adjustedStrength);

        // Decision thresholds
        let decision: 'swap' | 'auction' | 'keep';
        if (adjustedStrength < 0.3) {
            decision = 'swap';
        } else if (adjustedStrength < 0.6) {
            decision = Math.random() < personality.bluffing ? 'keep' : 'auction';
        } else {
            decision = 'keep';
        }
        
        console.log('Final decision:', decision);
        return decision;
    }

    static decideBlindBid(player: Player, gameState: GameState, currentBid: number): number {
        const personality = AI_PERSONALITIES[player.aiDifficulty || 'medium'];
        
        // Maximum bid based on chips and aggression
        const maxPossibleBid = Math.floor(player.chips * personality.aggression);
        
        // If current bid is too high, pass (return 0)
        if (currentBid >= maxPossibleBid) {
            return 0;
        }

        // Calculate bid increment based on personality and difficulty
        const bidIncrement = Math.max(
            1,
            Math.floor(BASE_BET_AMOUNTS[player.aiDifficulty || 'medium'] * 
                (1 + Math.random() * personality.aggression))
        );

        return Math.min(currentBid + bidIncrement, maxPossibleBid);
    }
} 