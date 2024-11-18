import styled from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import GameTable from './components/GameTable';
import { GameProvider } from './context/GameContext';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1b472b;
`;

function App() {
  return (
    <GameProvider>
      <AppContainer>
        <GlobalStyle />
        <GameTable />
      </AppContainer>
    </GameProvider>
  );
}

export default App; 