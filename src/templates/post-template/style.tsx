import { breakpoints } from "@_styles";
import styled from "styled-components";

export const PageMain = styled.main`
  width: 100%;
  position: relative;

  & > .contents-area {
    margin: 0 auto;
    max-width: ${breakpoints.lg}px;
  }

  & > .toc-area {
    z-index: 10;
    position: fixed;
    top: 10%;
    right: 0;
  }
`;
