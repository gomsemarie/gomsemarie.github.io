import { breakpoints } from "@_styles";
import styled from "styled-components";

export const TemplateDiv = styled.div`
  width: 100%;
  position: relative;

  & > .contents-area {
    margin: 0 auto;
    max-width: ${breakpoints.lg}px;
  }

  & > .toc-area {
    z-index: 10;
    position: fixed;
    top: 20%;
    right: 20px;
  }
`;
