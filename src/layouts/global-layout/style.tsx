import { boxShadow, breakpoints, myPalette } from "@_styles";
import styled from "styled-components";

export const LayoutDiv = styled.div`
  width: 100vw;
  /* display: grid;
  grid-template-rows: 300px minmax(${breakpoints.xs}px, 1fr);
  grid-template-areas: "sideBar contents"; */

  /* & > .side-bar-area {
    grid-area: sideBar;
    position: relative;
    min-height: 100vh;
  }

  & > .contents-area {
    grid-area: contents;
    position: relative;
  } */
`;

export const GlobalHeader = styled.header`
  z-index: 10;
  position: sticky;
  top: 0;
  width: 100%;
  height: 50px;

  background-color: ${myPalette("white")};
  border-bottom: 1px solid ${myPalette("gray", 3)};
`;

export const GlobalFooter = styled.footer``;
