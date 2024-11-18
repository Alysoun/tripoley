import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Position, Card, Rank } from '../types/GameTypes';
import { getCardFrontPath } from '../utils/cardAssets';

interface CardAnimationProps {
    startPos: { x: number; y: number; rotation: number };
    endPos: { x: number; y: number; rotation: number };
    duration: number;
    card?: Card;
    onComplete: () => void;
}

const moveCard = (startPos: Position, endPos: Position) => keyframes`
    0% {
        transform: translate(${startPos.x}px, ${startPos.y}px) rotate(${startPos.rotation}deg);
    }
    100% {
        transform: translate(${endPos.x}px, ${endPos.y}px) rotate(${endPos.rotation}deg);
    }
`;

const AnimatedCardWrapper = styled.div<{ 
    startPos: Position; 
    endPos: Position;
    duration: number;
}>`
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1000;
    animation: ${props => moveCard(props.startPos, props.endPos)} 
              ${props => props.duration}ms ease-out forwards;
`;

const CardImage = styled.img`
    height: 140px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const CardAnimation: React.FC<CardAnimationProps> = ({
    startPos,
    endPos,
    duration,
    card,
    onComplete
}) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, duration);
        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    return (
        <AnimatedCardWrapper
            startPos={startPos}
            endPos={endPos}
            duration={duration}
        >
            <CardImage 
                src={card ? getCardFrontPath(card.suit, card.value as Rank) : ''} 
                alt={`${card?.value} of ${card?.suit}`} 
            />
        </AnimatedCardWrapper>
    );
};

export default CardAnimation; 