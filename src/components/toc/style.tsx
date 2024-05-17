import {
  boxShadowCss,
  buttonShadowCss,
  myPalette,
  spacing,
  typography,
} from "@_styles";
import styled from "styled-components";

export const TocDiv = styled.div``;

export const TocIconDiv = styled.div`
  display: inline-block;

  & > button.open-button {
    border: 0;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;

    ${buttonShadowCss}
  }

  & > .toc-box {
    position: relative;
    padding: ${spacing.space[32]};
    /* left: 100%;
    opacity: 0; */
    background-color: white;
    border-radius: 10px;
    transition: all 0.2s;
    ${boxShadowCss}

    /* &.open {
      left: -100%;
      opacity: 1;
    } */

    & > button.close-button {
      position: absolute;
      padding: 10px;
      border: 0;
      top: 0;
      right: 0;
      cursor: pointer;
    }
  }
`;

export const TocElementUl = styled.ul`
  list-style: none;
  margin: 0;
  padding-left: ${spacing.space[16]};

  & > li {
    & > a {
      display: inline-block;
      padding-left: ${spacing.space[8]};
      margin-bottom: ${spacing.space[8]};

      text-decoration: none;
      font-family: ${typography.fonts.nanumGothic};
      font-size: ${typography.fontSizes.md};
      color: ${myPalette("black")};

      &.selected {
        color: ${myPalette("primary", 6)} !important;
      }
    }
  }

  &:has(ul) {
    & > li {
      & > a {
        border-left: ${spacing.space[4]} solid ${myPalette("primary", 6)};
        font-family: ${typography.fonts.nanumGothicBold};
      }
    }
  }

  &:first-child {
    padding-left: 0;
  }
`;
