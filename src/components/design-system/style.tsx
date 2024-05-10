import { myPalette, spacing, typography } from "@_styles";
import styled, { css } from "styled-components";
import SCISSOR from "@_assets/svgs/scissor.svg";

const headingCss = css`
  font-family: ${typography.fonts.mapleLight};
`;

export const StyledH1 = styled.h1`
  position: relative;
  overflow: hidden;
  line-height: 2;

  &::before {
    content: "";
    border-bottom: 2px solid ${myPalette("primary", 6)};
    position: absolute;
    bottom: 0;
    width: 100%;
    z-index: 0;
  }
  &::after {
    content: "";
    border-bottom: 2px solid ${myPalette("gray", 2)};
    position: absolute;
    bottom: 0;
    width: 100%;
    z-index: 1;
  }

  ${headingCss}
`;
export const StyledH2 = styled.h2`
  padding-left: ${spacing.space[16]};
  border-left: ${spacing.space[8]} solid ${myPalette("primary", 6)};

  ${headingCss}
`;
export const StyledH3 = styled.h3`
  ${headingCss}
`;
export const StyledH4 = styled.h4`
  ${headingCss}
`;
export const StyledEm = styled.em`
  font-style: normal;
  font-family: ${typography.fonts.mapleLight};
  color: ${myPalette("primary", 8)};
  background-color: ${myPalette("secondary", 1)};
`;

const hrHeight = spacing.space[4];
export const StyledHr = styled.hr`
  margin: ${spacing.space[16]} 0;
  border: none;
  border-bottom: ${hrHeight} dashed ${myPalette("gray", 1)} !important;
  display: flex;
  align-items: center;

  &::before {
    content: "";
    background-image: url(${SCISSOR});
    background-repeat: no-repeat;
    position: absolute;
    transform: translate(${spacing.space[16]}, calc(${hrHeight} / 2));
    width: 50px;
    height: 24px;
  }
`;

export const StyledTip = styled.div`
  border-radius: ${spacing.space[8]};
  overflow: hidden;
  margin: ${spacing.space[16]} 0;

  & p {
    margin: 0;
  }

  & > .title-area {
    display: flex;
    align-items: center;
    gap: ${spacing.space[8]};
    padding: ${spacing.space[8]} ${spacing.space[16]};
    background-color: ${myPalette("orange", 1)};

    & > p {
      font-family: ${typography.fonts.mapleBold};
      font-size: ${typography.fontSizes["md"]};
      color: ${myPalette("gray", 8)};
    }
  }
  & > .content-area {
    padding: ${spacing.space[16]};
    background-color: ${myPalette("orange")};

    & > p {
      font-family: ${typography.fonts.mapleLight};
      font-size: ${typography.fontSizes["md"]};
      color: ${myPalette("gray", 6)};
    }
  }
`;
