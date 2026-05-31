import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body,
  #root {
    height: 100%;
    height: 100dvh;
  }

  body {
    font-family: 'Roboto', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  button {
    font-family: 'Roboto', sans-serif;
  }

  @media (hover: none) and (pointer: coarse) {
    button:not([disabled]) {
      min-height: 44px;
      min-width: 44px;
    }
  }
`;
