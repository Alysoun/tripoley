import styled from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import GameTable from './components/GameTable';
import { GameProvider } from './context/GameContext';
import { AchievementProvider } from './context/AchievementContext';
import AchievementToast from './components/AchievementToast';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1b472b;
`;

function App() {
  return (
    <AchievementProvider>
      <GameProvider>
        <AppContainer>
          <GlobalStyle />
          <GameTable />
          <AchievementToast />
        </AppContainer>
      </GameProvider>
    </AchievementProvider>
  );
}

export default App; 