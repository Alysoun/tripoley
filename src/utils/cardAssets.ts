import { publicAsset } from './publicAsset';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export const getCardFrontPath = (suit: string, value: string) => {
  const valueMap: Record<string, string> = {
    A: 'ace',
    K: 'king',
    Q: 'queen',
    J: 'jack',
  };

  const formattedValue = valueMap[value] || value.toLowerCase();
  return publicAsset(`assets/cards/fronts/${suit.toLowerCase()}_${formattedValue}.svg`);
};

export const getCardBackPath = (style: string = 'red') => {
  return publicAsset(`assets/cards/backs/${style}.svg`);
};

/** Premium card back for Grand Dealer achievement. */
export const getPremiumCardBackPath = () => getCardBackPath('castle');

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
  'red2',
] as const;
