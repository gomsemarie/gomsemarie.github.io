import {
  breakpoints,
  myPalette,
  spacing,
  textEllipsisCss,
  typography,
} from "@_styles";
import styled from "styled-components";

export const PageMain = styled.main`
  width: 100%;
  position: relative;
  padding: 40px;

  & > .title-area {
    margin: 0 auto;
    max-width: ${breakpoints.lg}px;

    & > .tag-box {
      display: flex;
      justify-content: center;
      gap: ${spacing.space[4]};
      flex-wrap: wrap;

      & > span {
        font-family: ${typography.fonts.mapleBold};
        font-size: ${typography.fontSizes.xs};
        color: ${myPalette("blue", 6)};

        &:not(:last-child)::after {
          content: ",";
          font-family: inherit;
          font-size: inherit;
          color: inherit;
        }

        & > a {
          text-decoration: none;
          text-transform: uppercase;
          font-family: inherit;
          font-size: inherit;
          color: inherit;
        }
      }
    }
    & > .title-box {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      padding: ${spacing.space[10]} 0;

      & > p {
        margin: 0;
        font-family: ${typography.fonts.nanumGothicBold};
        font-size: ${typography.fontSizes["3xl"]};
        color: ${myPalette("black")};
      }
    }

    & > .desc-box {
      padding: ${spacing.space[20]} 0;
      border-bottom: 1px solid ${myPalette("gray", 3)};

      & > p {
        margin: 0;
        font-size: ${typography.fontSizes["md"]};
        color: ${myPalette("gray", 5)};
      }
    }

    & > .date-box {
      display: flex;

      & > p {
        margin-left: auto;
        font-size: ${typography.fontSizes["sm"]};
        color: ${myPalette("gray", 4)};
      }
    }
  }

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

export const TagSpan = styled.span``;
