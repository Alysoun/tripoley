import { Card, GameState, Player } from '../types/GameTypes';

interface PlayableCard {
    card: Card;
    isPlayable: boolean;
    reason?: string;
}

export class CardPlayLogic {
    static isCardPlayable(card: Card, player: Player, gameState: GameState): PlayableCard {
        switch (gameState.phase) {
            case 'betting':
                return { card, isPlayable: false, reason: 'Cannot play cards during betting phase' };
            case 'michigan':
                return this.isMichiganPlayable(card, player, gameState);
            case 'hearts':
                return this.isHeartsPlayable(card, player, gameState);
            case 'poker':
                return this.isPokerPlayable(card, player, gameState);
            default:
                return { card, isPlayable: false };
        }
    }

    private static isMichiganPlayable(card: Card, player: Player, gameState: GameState): PlayableCard {
        const currentTrick = this.getCurrentTrickCards(gameState);
        
        // If leading the trick, any card is playable
        if (currentTrick.length === 0) {
            return { card, isPlayable: true };
        }

        // Must follow suit if possible
        const leadSuit = currentTrick[0].suit;
        const hasSuit = player.cards.some(c => c.suit === leadSuit);
        
        if (hasSuit) {
            return {
                card,
                isPlayable: card.suit === leadSuit,
                reason: card.suit !== leadSuit ? 'Must follow suit' : undefined
            };
        }

        // If no cards of the lead suit, any card is playable
        return { card, isPlayable: true };
    }

    private static isHeartsPlayable(card: Card, player: Player, gameState: GameState): PlayableCard {
        // In Hearts phase, only hearts are playable
        if (card.suit !== 'hearts') {
            return {
                card,
                isPlayable: false,
                reason: 'Only hearts can be played in Hearts phase'
            };
        }

        return { card, isPlayable: true };
    }

    private static isPokerPlayable(card: Card, player: Player, gameState: GameState): PlayableCard {
        // In Poker phase, any card is playable
        return { card, isPlayable: true };
    }

    static evaluatePlay(card: Card, player: Player, gameState: GameState): {
        isValid: boolean;
        points: number;
        message?: string;
    } {
        switch (gameState.phase) {
            case 'michigan':
                return this.evaluateMichiganPlay(card, player, gameState);
            case 'hearts':
                return this.evaluateHeartsPlay(card, player, gameState);
            case 'poker':
                return this.evaluatePokerPlay(card, player, gameState);
            default:
                return { isValid: false, points: 0, message: 'Invalid phase for playing cards' };
        }
    }

    private static evaluateMichiganPlay(card: Card, player: Player, gameState: GameState): {
        isValid: boolean;
        points: number;
        message?: string;
    } {
        const currentTrick = this.getCurrentTrickCards(gameState);
        if (currentTrick.length === 0) {
            return { isValid: true, points: 0 };
        }

        const leadCard = currentTrick[0];
        const leadSuit = leadCard.suit;
        const hasSuit = player.cards.some(c => c.suit === leadSuit);

        if (hasSuit && card.suit !== leadSuit) {
            return {
                isValid: false,
                points: 0,
                message: 'Must follow suit when possible'
            };
        }

        // Determine if this play wins the trick
        const isWinningCard = this.isWinningCard(card, currentTrick);
        return {
            isValid: true,
            points: isWinningCard ? 1 : 0,
            message: isWinningCard ? 'Winning the trick!' : undefined
        };
    }

    private static evaluateHeartsPlay(card: Card, player: Player, gameState: GameState): {
        isValid: boolean;
        points: number;
        message?: string;
    } {
        if (card.suit !== 'hearts') {
            return {
                isValid: false,
                points: 0,
                message: 'Only hearts can be played in Hearts phase'
            };
        }

        // Award points based on card value
        const points = this.getHeartPoints(card);
        return {
            isValid: true,
            points,
            message: points > 0 ? `Scored ${points} points!` : undefined
        };
    }

    private static evaluatePokerPlay(card: Card, player: Player, gameState: GameState): {
        isValid: boolean;
        points: number;
        message?: string;
    } {
        // In poker phase, evaluate the hand after each play
        const remainingCards = player.cards.filter(c => c !== card);
        const handValue = this.evaluatePokerHand([...remainingCards, card]);
        
        return {
            isValid: true,
            points: handValue.points,
            message: handValue.message
        };
    }

    private static getCurrentTrickCards(gameState: GameState): Card[] {
        // Implementation depends on how tricks are stored in your game state
        // This is a placeholder
        return [];
    }

    private static isWinningCard(playedCard: Card, currentTrick: Card[]): boolean {
        if (currentTrick.length === 0) return true;

        const leadSuit = currentTrick[0].suit;
        const validCards = currentTrick.filter(card => card.suit === leadSuit);
        const highestCard = this.getHighestCard(validCards);

        return playedCard.suit === leadSuit && 
               this.getCardValue(playedCard) > this.getCardValue(highestCard);
    }

    private static getCardValue(card: Card): number {
        const values: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
            '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return values[card.value];
    }

    private static getHighestCard(cards: Card[]): Card {
        return cards.reduce((highest, current) => 
            this.getCardValue(current) > this.getCardValue(highest) ? current : highest
        );
    }

    private static getHeartPoints(card: Card): number {
        if (card.suit !== 'hearts') return 0;
        const values: Record<string, number> = {
            'A': 15, 'K': 10, 'Q': 5, 'J': 3
        };
        return values[card.value] || 0;
    }

    private static evaluatePokerHand(cards: Card[]): {
        points: number;
        message: string;
    } {
        // Implement poker hand evaluation logic
        // This is a simplified version
        return {
            points: 0,
            message: 'No poker hand yet'
        };
    }
} 