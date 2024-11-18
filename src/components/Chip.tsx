import React from 'react';
import styled from 'styled-components';

interface ChipProps {
    value: number;
    size?: 'small' | 'medium' | 'large';
    onClick?: () => void;
}

// Color schemes for different chip values
const CHIP_COLORS = {
    1: { primary: '#FFFFFF', secondary: '#EEEEEE', accent: '#333333' },
    5: { primary: '#FF4444', secondary: '#CC0000', accent: '#FFFFFF' },
    10: { primary: '#4444FF', secondary: '#0000CC', accent: '#FFFFFF' },
    25: { primary: '#44FF44', secondary: '#00CC00', accent: '#FFFFFF' },
    50: { primary: '#FFD700', secondary: '#FFA500', accent: '#000000' },
    100: { primary: '#000000', secondary: '#333333', accent: '#FFFFFF' },
    500: { primary: '#800080', secondary: '#4B0082', accent: '#FFFFFF' },
    1000: { primary: '#C0C0C0', secondary: '#808080', accent: '#000000' }
};

const ChipContainer = styled.div<{ size: string; $colors: typeof CHIP_COLORS[keyof typeof CHIP_COLORS] }>`
    position: relative;
    width: ${props => ({
        small: '30px',
        medium: '40px',
        large: '50px'
    })[props.size]};
    height: ${props => ({
        small: '30px',
        medium: '40px',
        large: '50px'
    })[props.size]};
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;

    /* Base layer with gradient */
    background: linear-gradient(
        135deg,
        ${props => props.$colors.primary} 0%,
        ${props => props.$colors.secondary} 100%
    );

    /* Edge pattern */
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 50%;
        background: repeating-conic-gradient(
            from 0deg,
            transparent 0deg 20deg,
            rgba(255, 255, 255, 0.1) 20deg 40deg
        );
        mask: radial-gradient(
            circle at center,
            transparent 60%,
            black 60% 100%
        );
    }

    /* Inner pattern */
    &::after {
        content: '';
        position: absolute;
        top: 15%;
        left: 15%;
        right: 15%;
        bottom: 15%;
        border-radius: 50%;
        background: 
            repeating-conic-gradient(
                from 0deg,
                ${props => props.$colors.accent}20 0deg 10deg,
                transparent 10deg 20deg
            ),
            radial-gradient(
                circle at center,
                ${props => props.$colors.primary} 0%,
                ${props => props.$colors.secondary} 100%
            );
        border: 1px solid ${props => props.$colors.accent}40;
    }

    /* Hover effects */
    &:hover {
        transform: translateY(-2px) rotate(15deg);
        box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.2),
            0 0 15px ${props => props.$colors.primary}40;
    }

    &:active {
        transform: translateY(1px);
    }
`;

const ChipValue = styled.div<{ size: string; color: string }>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${props => props.color};
    font-size: ${props => ({
        small: '0.7rem',
        medium: '0.9rem',
        large: '1.1rem'
    })[props.size]};
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    z-index: 1;
`;

const Chip: React.FC<ChipProps> = ({ value, size = 'medium', onClick }) => {
    const colors = CHIP_COLORS[value as keyof typeof CHIP_COLORS] || CHIP_COLORS[1];

    return (
        <ChipContainer size={size} $colors={colors} onClick={onClick}>
            <ChipValue size={size} color={colors.accent}>
                {value}
            </ChipValue>
        </ChipContainer>
    );
};

export default Chip; 