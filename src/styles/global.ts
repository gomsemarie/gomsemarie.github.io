import { createGlobalStyle } from "styled-components";
import MapleStoryBold from "../assets/fonts/MapleStoryBold.woff2";
import MapleStoryLight from "../assets/fonts/MapleStoryLight.woff2";

const GlobalStyle = createGlobalStyle`
  @font-face {
        font-family: 'MapleStoryBold';
        src: local('MapleStoryBold'), local('MapleStoryBold');
        font-style: normal;
        src: url(${MapleStoryBold}) format('woff2');
  }
  @font-face {
        font-family: 'MapleStoryLight';
        src: local('MapleStoryLight'), local('MapleStoryLight');
        font-style: normal;
        src: url(${MapleStoryLight}) format('woff2');
  }

  body {
      font-family: 'MapleStoryLight', sans-serif;
  }
`;

export default GlobalStyle;
