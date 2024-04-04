import { createGlobalStyle } from "styled-components";
import MapleStoryBold from "@_assets/fonts/MapleStoryBold.woff2";
import MapleStoryLight from "@_assets/fonts/MapleStoryLight.woff2";

import "prismjs/themes/prism-tomorrow.css";
import "sanitize.css";
import "sanitize.css/forms.css";
import "sanitize.css/typography.css";

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
