import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
`;

const FeedbackContainer = styled.div<{ type: 'success' | 'error' | 'info' }>`
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 2000;
    animation: ${fadeIn} 0.3s ease-out,
               ${fadeOut} 0.3s ease-out 2.7s forwards;
    background: ${props => ({
        success: 'linear-gradient(135deg, #4CAF50, #45a049)',
        error: 'linear-gradient(135deg, #f44336, #d32f2f)',
        info: 'linear-gradient(135deg, #2196F3, #1976D2)'
    })[props.type]};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

interface GameFeedbackProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onComplete?: () => void;
}

const GameFeedback: React.FC<GameFeedbackProps> = ({ message, type, onComplete }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <FeedbackContainer type={type}>
            {message}
        </FeedbackContainer>
    );
};

export default GameFeedback; 