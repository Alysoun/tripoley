import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';

const EditorContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
`;

const Grid = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
        linear-gradient(to right, rgba(255,255,255,.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,.1) 1px, transparent 1px);
    background-size: 5% 5%;  // 20x20 grid
`;

const GridCoordinates = styled.div`
    position: absolute;
    color: rgba(255,255,255,0.5);
    font-size: 10px;
`;

const PlayerMarker = styled.div`
    position: absolute;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 8px;
    cursor: move;
    user-select: none;

    &::after {
        content: attr(data-coordinates);
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        white-space: nowrap;
        color: white;
    }
`;

const Controls = styled.div`
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    padding: 20px;
    border-radius: 8px;
    color: white;
    z-index: 1001;
`;

const CopyButton = styled.button`
    margin-top: 10px;
    padding: 8px 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
        background: #45a049;
    }
`;

interface Position {
    left: string;
    top: string;
}

interface PlayerPositionEditorProps {
    onSave: (positions: Record<number, Position[]>) => void;
    onClose: () => void;
}

const PLAYER_POSITIONS_KEY = 'playerPositions';

export const PlayerPositionEditor: React.FC<PlayerPositionEditorProps> = ({ onSave, onClose }) => {
    const [playerCount, setPlayerCount] = useState(4);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    
    const [positions, setPositions] = useState<Record<number, Position[]>>(() => {
        const saved = localStorage.getItem('playerPositions');
        return saved ? JSON.parse(saved) : {};
    });

    const handleDrag = (playerIndex: number, _: DraggableEvent, data: DraggableData) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const { x, y } = data;
        const left = `${Math.round((x / containerRect.width) * 1000) / 10}%`;
        const top = `${Math.round((y / containerRect.height) * 1000) / 10}%`;

        setPositions(prev => ({
            ...prev,
            [playerCount]: prev[playerCount]?.map((pos, i) => 
                i === playerIndex ? { left, top } : pos
            ) || []
        }));
    };

    const handleSave = (positions: Record<number, Position[]>) => {
        // Save to localStorage
        localStorage.setItem(PLAYER_POSITIONS_KEY, JSON.stringify(positions));
        onSave(positions);
    };

    const initializePositions = (count: number) => {
        setPlayerCount(count);
        if (!positions[count]) {
            const newPositions = Array(count).fill(null).map((_, index) => ({
                left: `${50 + Math.cos(index * (2 * Math.PI / count)) * 30}%`,
                top: `${50 + Math.sin(index * (2 * Math.PI / count)) * 30}%`
            }));
            setPositions(prev => ({ ...prev, [count]: newPositions }));
        }
    };

    const handleCopyToClipboard = () => {
        const currentPositions = positions[playerCount];
        if (!currentPositions) return;

        const formattedPositions = `${playerCount}: [\n` +
            currentPositions.map((pos, index) => 
                `    { left: '${pos.left}', top: '${pos.top}' },     // Player ${index + 1}`
            ).join('\n') +
            '\n],';

        navigator.clipboard.writeText(formattedPositions).then(() => {
            alert('Positions copied to clipboard! Ready to paste into PLAYER_POSITIONS.');
        }).catch(err => {
            console.error('Failed to copy positions:', err);
            alert('Failed to copy positions to clipboard.');
        });
    };

    return (
        <EditorContainer ref={containerRef} id="editorContainer">
            <Grid>
                {Array.from({ length: 20 }).map((_, i) => (
                    <GridCoordinates 
                        key={`h-${i}`} 
                        style={{ left: `${i * 5}%`, top: '0' }}
                    >
                        {i * 5}
                    </GridCoordinates>
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                    <GridCoordinates 
                        key={`v-${i}`} 
                        style={{ left: '0', top: `${i * 5}%` }}
                    >
                        {i * 5}
                    </GridCoordinates>
                ))}
            </Grid>

            <Controls>
                <div>
                    <button onClick={() => initializePositions(4)}>4 Players</button>
                    <button onClick={() => initializePositions(5)}>5 Players</button>
                    <button onClick={() => initializePositions(6)}>6 Players</button>
                    <button onClick={() => initializePositions(7)}>7 Players</button>
                    <button onClick={() => initializePositions(8)}>8 Players</button>
                    <button onClick={() => initializePositions(9)}>9 Players</button>
                </div>
                <div>
                    <button onClick={() => handleSave(positions)}>Save Positions</button>
                    <button onClick={onClose}>Close</button>
                    <CopyButton onClick={handleCopyToClipboard}>
                        Copy Positions to Clipboard
                    </CopyButton>
                </div>
                <pre>
                    {JSON.stringify(positions[playerCount], null, 2)}
                </pre>
            </Controls>

            {positions[playerCount]?.map((pos, index) => (
                <Draggable
                    key={index}
                    nodeRef={nodeRef}
                    defaultPosition={{
                        x: (parseFloat(pos.left) / 100) * window.innerWidth,
                        y: (parseFloat(pos.top) / 100) * window.innerHeight
                    }}
                    grid={[window.innerWidth * 0.05, window.innerHeight * 0.05]} // 5% grid
                    onDrag={(e, data) => handleDrag(index, e, data)}
                >
                    <PlayerMarker 
                        ref={nodeRef}
                        data-coordinates={`${pos.left}, ${pos.top}`}
                    >
                        Player {index + 1}
                    </PlayerMarker>
                </Draggable>
            ))}
        </EditorContainer>
    );
}; 