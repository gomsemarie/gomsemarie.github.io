import {
  ClearedLi,
  ClearedUl,
  myPalette,
  spacing,
  textEllipsisCss,
  typography,
} from "@_styles";
import styled, { css } from "styled-components";

const trasitionCss = css`
  transition: all 0.2s ease-in;
`;

export const PostNavigatorUl = styled(ClearedUl)`
  width: 100%;
  border-top: 1px solid ${myPalette("gray", 2)};
  border-bottom: 1px solid ${myPalette("gray", 2)};
  padding: ${spacing.space[16]};
`;

export const PostNavigatorLi = styled(ClearedLi)`
  width: 100%;
  display: grid;
  gap: ${spacing.space[4]};
  cursor: pointer;

  & > .title-box {
    width: 100%;
    display: grid;
    grid-template-columns: 2rem 1fr max-content;
    align-items: center;
    gap: ${spacing.space[16]};
    padding: ${spacing.space[12]} ${spacing.space[16]};
    border-radius: ${spacing.space[10]};

    color: ${myPalette("gray", 5)};

    ${trasitionCss}

    & > .icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background-color: ${myPalette("gray", 1)};

      ${trasitionCss}

      & > svg {
        font-size: ${typography.fontSizes.sm};
        fill: inherit;
      }
    }
    & > p {
      display: inline-block;
      margin: 0;
      font-size: ${typography.fontSizes.md};
      color: inherit;

      ${textEllipsisCss}
      ${trasitionCss}

      & > a {
        display: inherit;
        text-decoration: none;
        color: inherit;
        font-size: inherit;
        ${textEllipsisCss}
      }
    }
    & > i.mark-icon {
      font-size: ${typography.fontSizes.xs};
    }
    & > i.arrow-icon {
      margin-left: auto;
      font-size: ${typography.fontSizes.xs};

      ${trasitionCss}
    }
  }

  & > ul {
    display: grid;
    gap: ${spacing.space[4]};
    height: 0;
    overflow: hidden;
  }

  &:hover,
  &.active {
    & > .title-box {
      background-color: ${myPalette("primary")};

      & > .icon-box {
        background-color: ${myPalette("primary", 1)};

        & > svg {
          fill: ${myPalette("primary", 5)};
        }
      }
      & > p {
        color: ${myPalette("primary", 5)};
      }
    }
  }

  &.active {
    & > ul {
      ${trasitionCss}
      height: 100%;
    }
  }

  &.inner {
    & > .title-box {
      background-color: transparent;
      grid-template-columns: max-content 2rem 1fr;
    }

    & > .title-box > .icon-box {
      background-color: transparent;
    }
  }
`;
