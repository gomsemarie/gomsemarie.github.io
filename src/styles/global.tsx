import { createGlobalStyle } from "styled-components";
import MapleStoryBold from "@_assets/fonts/MapleStoryBold.woff2";
import MapleStoryLight from "@_assets/fonts/MapleStoryLight.woff2";

import "prismjs/themes/prism-tomorrow.css"; // Prism - Theme
import "prismjs/plugins/line-numbers/prism-line-numbers.css"; // Prism - Line numbers style
// import "prismjs/plugins/command-line/prism-command-line.css"; // Prism - Command line style
import "sanitize.css";
import "sanitize.css/forms.css";
import "sanitize.css/typography.css";
import { media } from "./media";
// import { defineCustomElements as deckDeckGoHighlightElement } from "@deckdeckgo/highlight-code/dist/loader";
// deckDeckGoHighlightElement();

const styled = { createGlobalStyle }; // Prettier 적용되도록
const GlobalStyle = styled.createGlobalStyle`
  @font-face {
    font-family: "MapleStoryBold";
    src: local("MapleStoryBold"), local("MapleStoryBold");
    font-style: normal;
    src: url(${MapleStoryBold}) format("woff2");
  }
  @font-face {
    font-family: "MapleStoryLight";
    src: local("MapleStoryLight"), local("MapleStoryLight");
    font-style: normal;
    src: url(${MapleStoryLight}) format("woff2");
  }

  body {
    font-family: "MapleStoryLight", sans-serif;
  }

  // Prism - Copy button custom style
  .gatsby-remark-prismjs-copy-button-container {
    left: 0;
    padding-right: 8px;
  }

  // Prism - Code block custom style
  .gatsby-highlight {
    &::before {
      content: "Code Block";
      background: var(--code-block-mac-color);
      border-radius: 5px 5px 0 0;
      height: 40px;
      left: 0;
      top: 0;
      width: 100%;
    }
  }

  // Prism - Code block - line numbers custom style
  .gatsby-highlight pre[class*="language-"].line-numbers {
    padding: 1em;
    padding-left: 3.8em;

    & > span {
      padding: 1em 0;
      padding-left: 1em;
      border: none;
    }

    ${media.sm.styler`
    padding-left: 1em;

    & > span {
      display: none;

    }
    `}
  }
`;

export default GlobalStyle;
