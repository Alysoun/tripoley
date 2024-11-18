import styled from 'styled-components';

const DeadHandBadge = styled.div<{ $position?: number }>`
    background: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    border: 1px solid #ff0000;
`;

interface DeadHandIndicatorProps {
    suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    position?: number;
}

const DeadHandIndicator: React.FC<DeadHandIndicatorProps> = ({ suit, position }) => {
    if (!suit) return null;
    
    return (
        <DeadHandBadge $position={position}>
            Dead in {suit} ⚠️
        </DeadHandBadge>
    );
};

export default DeadHandIndicator; 