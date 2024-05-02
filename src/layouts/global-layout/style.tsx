import { boxShadow, breakpoints } from "@_styles";
import styled from "styled-components";

export const LayoutDiv = styled.div`
  width: 100vw;
  display: grid;
  grid-template-columns: 300px minmax(${breakpoints.xs}px, 1fr);
  grid-template-areas: "sideBar contents";

  & > .side-bar-area {
    grid-area: sideBar;
    position: relative;
    min-height: 100vh;
    ${boxShadow}
  }

  & > .contents-area {
    grid-area: contents;
    position: relative;
  }
`;

export const SideBarDiv = styled.div`
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
`;
