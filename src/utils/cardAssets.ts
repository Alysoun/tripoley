// Define card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

// Function to get card front path
export const getCardFrontPath = (suit: string, value: string) => {
    const valueMap: { [key: string]: string } = {
        'A': 'ace',
        'K': 'king',
        'Q': 'queen',
        'J': 'jack',
    };

    const formattedValue = valueMap[value] || value.toLowerCase();
    return `/src/components/cards/fronts/${suit.toLowerCase()}_${formattedValue}.svg`;
};

// Function to get card back path
export const getCardBackPath = (style: string = 'red', usePng: boolean = false) => {
    return `/src/components/cards/backs/${style}.svg`;
};

// Available back styles
export const cardBackStyles = [
    'abstract',
    'abstract_clouds',
    'abstract_scene',
    'astronaut',
    'blue',
    'blue2',
    'cars',
    'castle',
    'fish',
    'frog',
    'red',
    'red2'
] as const; 