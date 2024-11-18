import React from 'react';
import styled from 'styled-components';

const SelectContainer = styled.div`
    background: rgba(0, 0, 0, 0.8);
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    min-width: 400px;
`;

const Title = styled.h2`
    color: white;
    margin-bottom: 2rem;
`;

const Subtitle = styled.p`
    color: #ccc;
    margin-bottom: 1.5rem;
    font-size: 1rem;
`;

const ButtonGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1rem;
`;

const PlayerButton = styled.button`
    background: #2a653d;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #347a4a;
        transform: scale(1.05);
    }
`;

const SmallText = styled.span`
    display: block;
    font-size: 0.8rem;
    opacity: 0.8;
    margin-top: 0.3rem;
`;

const PlayerSelect: React.FC<{ onStart: (players: number) => void }> = ({ onStart }) => {
    const playerOptions = [4, 5, 6, 7, 8, 9];
    
    return (
        <SelectContainer>
            <Title>Select Number of Players</Title>
            <Subtitle>Including you as the human player</Subtitle>
            <ButtonGrid>
                {playerOptions.map(count => (
                    <PlayerButton
                        key={count}
                        onClick={() => onStart(count)}
                    >
                        {count} Players
                        {/* <SmallText>({count - 1} AI + You)</SmallText> */}
                    </PlayerButton>
                ))}
            </ButtonGrid>
        </SelectContainer>
    );
};

export default PlayerSelect; 