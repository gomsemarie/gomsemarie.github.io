import {
  breakpoints,
  media,
  myPalette,
  spacing,
  textEllipsisCss,
  typography,
} from "@_styles";
import styled from "styled-components";

export const TemplateDiv = styled.div`
  width: 100%;
  position: relative;

  .title-area {
    display: grid;
    grid-template-columns: minmax(${breakpoints.xs}px, 1fr);
    gap: ${spacing.space[16]};
    margin: ${spacing.space[36]} ${spacing.space[16]};

    & > .title-box {
      display: flex;
      justify-content: center;

      & > p {
        margin: 0;
        padding: 0 ${spacing.space[40]};
        font-family: ${typography.fonts.mapleLight};
        font-size: ${typography.fontSizes["4xl"]};
        text-transform: uppercase;
        border-bottom: 3px dashed ${myPalette("primary", 6)};

        ${textEllipsisCss}
      }
    }
    & > .count-box {
      display: flex;
      justify-content: center;

      & > p {
        margin: 0;
        font-family: ${typography.fonts.nanumGothic};
        font-size: ${typography.fontSizes["sm"]};
        color: ${myPalette("gray", 6)};

        ${textEllipsisCss}
      }
    }
  }

  .list-area {
    padding: 0 ${spacing.space[32]};

    & > .list-box {
      margin: 0 auto;
      max-width: ${breakpoints.xl}px;

      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 1fr;
      gap: ${spacing.space[16]};

      ${media.lg.styler`
        grid-template-columns: repeat(2, 1fr);
      `}

      ${media.md.styler`
        grid-template-columns: repeat(1, 1fr);
      `}
    }
  }
`;
