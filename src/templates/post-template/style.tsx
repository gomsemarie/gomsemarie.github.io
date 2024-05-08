import { breakpoints, myPalette, spacing, typography } from "@_styles";
import styled from "styled-components";

const tocWidth = 300;

export const PageMain = styled.main`
  width: 100%;
  position: relative;
  padding: ${spacing.space[40]};
`;

export const ContentsArticle = styled.article`
  position: relative;
  max-width: ${breakpoints.lg}px;
  margin: 0 auto;

  & > .title-area {
    & > .tag-box {
      display: flex;
      justify-content: center;
      gap: ${spacing.space[4]};
      flex-wrap: wrap;

      & > span {
        font-family: ${typography.fonts.nanumGothicBold};
        font-size: ${typography.fontSizes.xs};
        color: ${myPalette("primary", 6)};

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
  }

  & > .toc-area {
    width: ${tocWidth}px;
    position: absolute;
    height: 100%;
    top: 0;
    left: 100%;

    & > .toc-box {
      margin-top: ${spacing.space[64]};
      position: sticky;
      top: ${spacing.space[64]};
      margin-left: ${spacing.space[40]};
    }
    & > .toc-icon-box {
      position: fixed;
      right: ${spacing.space[8]};
      display: none;
    }

    @media (max-width: ${breakpoints.lg + 2 * tocWidth}px) {
      width: 0;
      & > .toc-box {
        display: none;
      }

      & > .toc-icon-box {
        display: block;
      }
    }
  }
`;

export const TagSpan = styled.span``;
