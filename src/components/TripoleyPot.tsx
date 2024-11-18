import React, { useState } from 'react';
import styled from 'styled-components';
import Draggable from 'react-draggable';

interface PotSection {
    label: SectionLabel;
    position: Position;
    chips: number;
    cards: any[];
}

interface TripoleyPotProps {
    sections: PotSection[];
    onSectionClick?: (section: PotSection) => void;
}

type SectionLabel = 
  | 'Ten' 
  | 'Jack' 
  | 'Queen' 
  | 'King' 
  | 'Ace' 
  | '8-9-10' 
  | 'King-Queen' 
  | 'Kitty' 
  | 'POT';

type Position = {
    x: number;
    y: number;
};

type GameSectionLabel = 'michigan' | 'hearts' | 'poker' | 'kitty';

const SECTION_MAPPING: Record<GameSectionLabel, PotSectionLabel[]> = {
    'michigan': ['Ten', 'Jack', 'Queen', 'POT'],
    'hearts': ['King', 'Ace'],
    'poker': ['8-9-10', 'King-Queen'],
    'kitty': ['Kitty']
};

const SECTION_POSITIONS: Record<PotSectionLabel, Position> = {
    "Ten": { x: 457, y: 317 },
    "Jack": { x: 321, y: 456 },
    "Queen": { x: 100, y: 448 },
    "King": { x: -17, y: 332 },
    "Ace": { x: -14, y: 141 },
    "8-9-10": { x: 95, y: 21 },
    "King-Queen": { x: 337, y: 21 },
    "Kitty": { x: 451, y: 143 },
    "POT": { x: 216, y: 279 }
} as const;

const PotContainer = styled.div`
    position: relative;
    width: 500px;
    height: 500px;
    margin: 0 auto;
    margin-top: -100px;
`;

const PotImage = styled.img`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    object-fit: contain;
`;

const PotSection = styled.div<{ $x: number; $y: number }>`
    position: absolute;
    transform: translate(${props => props.$x}px, ${props => props.$y}px);
    cursor: pointer;
    z-index: 2;
`;

const ChipCount = styled.div`
    background-color: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
    border: 2px solid #FFD700; // Gold border
    font-size: 14px;
    min-width: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
`;

const ChipIcon = styled.span`
    width: 12px;
    height: 12px;
    background-color: #FFD700;
    border-radius: 50%;
    display: inline-block;
    margin-left: 4px;
`;

const EditorPanel = styled.div`
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    color: white;
    border-radius: 5px;
    z-index: 1000;
`;

const EditorSection = styled.div`
    margin: 5px 0;
    font-size: 12px;
`;

const DraggableSection: React.FC<{
    position: Position;
    onDragStop: (e: any, data: { x: number; y: number }) => void;
    onDrag: () => void;
    children: React.ReactNode;
}> = ({ position, onDragStop, onDrag, children }) => {
    const nodeRef = React.useRef(null);
    
    return (
        <Draggable
            nodeRef={nodeRef}
            position={position}
            onStop={onDragStop}
            onDrag={onDrag}
        >
            <div ref={nodeRef}>
                {children}
            </div>
        </Draggable>
    );
};

const TripoleyPot: React.FC<TripoleyPotProps & { isEditMode?: boolean }> = ({ 
    sections, 
    onSectionClick,
    isEditMode = false 
}) => {
    const [positions, setPositions] = useState(SECTION_POSITIONS);
    const [selectedSection, setSelectedSection] = useState<PotSectionLabel | null>(null);

    const handleDragStop = (label: PotSectionLabel, e: any, data: { x: number, y: number }) => {
        setPositions(prev => ({
            ...prev,
            [label]: { x: data.x, y: data.y }
        }));
    };

    const copyPositionsToClipboard = () => {
        const positionsString = JSON.stringify(positions, null, 2);
        navigator.clipboard.writeText(positionsString);
        alert('Positions copied to clipboard!');
    };

    return (
        <>
            {isEditMode && (
                <EditorPanel>
                    <h3>Position Editor</h3>
                    <button onClick={copyPositionsToClipboard}>
                        Copy Positions
                    </button>
                    {selectedSection && (
                        <EditorSection>
                            Selected: {selectedSection}
                            <br />
                            X: {positions[selectedSection].x}
                            <br />
                            Y: {positions[selectedSection].y}
                        </EditorSection>
                    )}
                </EditorPanel>
            )}
            <PotContainer>
                <PotImage 
                    src="/assets/pot/Pot3.png" 
                    alt="Tripoley pot" 
                />
                {sections.map((section) => {
                    const potSections = SECTION_MAPPING[section.label as GameSectionLabel];
                    if (!potSections) return null;
                    
                    return potSections.map(potLabel => {
                        const position = positions[potLabel];
                        const content = (
                            <ChipCount>
                                {section.chips}
                                <ChipIcon />
                            </ChipCount>
                        );

                        return isEditMode ? (
                            <DraggableSection
                                key={potLabel}
                                position={position}
                                onDragStop={(e, data) => handleDragStop(potLabel, e, data)}
                                onDrag={() => setSelectedSection(potLabel)}
                            >
                                <PotSection
                                    style={{ position: 'absolute' }}
                                    onClick={() => setSelectedSection(potLabel)}
                                >
                                    {content}
                                </PotSection>
                            </DraggableSection>
                        ) : (
                            <PotSection
                                key={potLabel}
                                $x={position.x}
                                $y={position.y}
                                onClick={() => onSectionClick?.(section)}
                            >
                                {content}
                            </PotSection>
                        );
                    });
                })}
            </PotContainer>
        </>
    );
};

export default TripoleyPot; 