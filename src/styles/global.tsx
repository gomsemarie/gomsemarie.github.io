import { createGlobalStyle, css } from "styled-components";
import MapleStoryLight from "@_assets/fonts/MapleStoryLight.woff2";
import MapleStoryBold from "@_assets/fonts/MapleStoryBold.woff2";
import NanumGothic from "@_assets/fonts/NanumGothic.woff2";
import NanumGothicLight from "@_assets/fonts/NanumGothicLight.woff2";
import NanumGothicBold from "@_assets/fonts/NanumGothicBold.woff2";
import NanumGothicExtraBold from "@_assets/fonts/NanumGothicExtraBold.woff2";

import { media } from "./media";
import { lighten } from "polished";
// import { defineCustomElements as deckDeckGoHighlightElement } from "@deckdeckgo/highlight-code/dist/loader";
// deckDeckGoHighlightElement();

// Code Button - Code Block 헤더, 복사 버튼 디자인
const headerHeight = 36;
const CodeButtonStyle = css`
  // 헤더 디자인
  span:has(.gatsby-code-button-container) {
    background-color: #1e1e1e;
    position: relative;
    display: flex;
    align-items: center;
    height: ${headerHeight}px;
    padding: 0 1rem;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    /* font-size: 0; */
    &:before {
      display: block;
      content: "";
      background: #fc625d;
      border-radius: 50%;
      box-shadow: 20px 0 #fdbc40, 40px 0 #35cd4b;
      height: 12px;
      width: 12px;
    }
  }

  // 복사 버튼 디자인
  .gatsby-code-button-container {
    display: block !important;
    top: calc(100% + 0.5rem) !important;
    margin-left: auto;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid ${lighten(0.5, "black")};
    opacity: 0;
    cursor: pointer;
    transition: all 0.2s;

    // .custom-button-container
    font-size: 1em;

    &:hover {
      opacity: 1;
    }
    & > .custom-button {
    }
  }
  .gatsby-code-button {
    display: flex;
    align-items: center;
    gap: 8px;
    & > i {
      color: white;
      font-size: 1rem;
    }
    & > p {
      color: white;
      font-size: 1rem;
      text-transform: lowercase;
      margin: 0;
    }

    &:hover:after {
      display: none !important;
    }
  }

  span:has(.gatsby-code-button-container):has(+ span:hover) {
    & > .gatsby-code-button-container {
      opacity: 1;
    }
  }

  .gatsby-highlight {
    & > pre {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      margin-top: 0 !important;
    }
  }
`;

const styled = { createGlobalStyle }; // Prettier 적용되도록
const GlobalStyle = styled.createGlobalStyle`
  // Maple Story Font
  @font-face {
    font-family: "MapleStoryLight";
    src: local("MapleStoryLight"), local("MapleStoryLight");
    font-style: normal;
    font-weight: lighter;
    src: url(${MapleStoryLight}) format("woff2");
  }
  @font-face {
    font-family: "MapleStoryBold";
    src: local("MapleStoryBold"), local("MapleStoryBold");
    font-style: normal;
    src: url(${MapleStoryBold}) format("woff2");
  }

  // Nanum Gothic Font
  @font-face {
    font-family: "NanumGothic";
    src: local("NanumGothic"), local("NanumGothic");
    font-style: normal;
    src: url(${NanumGothic}) format("font-woff2");
  }
  @font-face {
    font-family: "NanumGothicLight";
    src: local("NanumGothicLight"), local("NanumGothicLight");
    font-style: normal;
    src: url(${NanumGothicLight}) format("font-woff2");
  }
  @font-face {
    font-family: "NanumGothicBold";
    src: local("NanumGothicBold"), local("NanumGothicBold");
    font-style: normal;
    src: url(${NanumGothicBold}) format("font-woff2");
  }
  @font-face {
    font-family: "NanumGothicExtraBold";
    src: local("NanumGothicExtraBold"), local("NanumGothicExtraBold");
    font-style: normal;
    src: url(${NanumGothicExtraBold}) format("font-woff2");
  }

  body {
    font-family: "NanumGothic", sans-serif;
    font-size: 16px;
  }

  // Prism - Copy button custom style
  .gatsby-remark-prismjs-copy-button-container {
    left: 0;
    padding-right: 8px;
  }

  // Prism - Code block custom style
  /* .gatsby-highlight {
    &::before {
      content: "Code Block";
      background: var(--code-block-mac-color);
      border-radius: 5px 5px 0 0;
      height: 40px;
      left: 0;
      top: 0;
      width: 100%;
    }
  } */

  // Prism - Code block - line numbers custom style
  .gatsby-highlight pre[class*="language-"].line-numbers {
    padding: 1rem;
    padding-left: 3.8rem;

    & > span {
      padding: 1rem 0;
      padding-left: 1rem;
      border: none;
    }

    ${media.sm.styler`
    padding-left: 1em;

    & > span {
      display: none;

    }
    `}
  }

  ${CodeButtonStyle}
`;

export default GlobalStyle;
