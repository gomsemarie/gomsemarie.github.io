import { myPalette, spacing, typography } from "@_styles";
import styled, { css } from "styled-components";
import SCISSOR from "@_assets/svgs/scissor.svg";

const headingCss = css`
  font-family: ${typography.fonts.mapleLight};
`;

export const StyledH1 = styled.h1`
  display: grid;
  grid-template-columns: minmax(50px, max-content) auto;
  position: relative;
  line-height: 2;

  & > hr {
    margin: 0;
  }

  & > hr.highlight {
    height: 2px;
    border: 0;
    background: ${myPalette("primary", 6)};
  }
  & > hr:last-child {
    height: 2px;
    border: 0;
    background: ${myPalette("gray", 2)};
  }

  /* &::before {
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
  } */

  ${headingCss}
`;
export const StyledH2 = styled.h2`
  display: grid;
  grid-template-columns: max-content auto;
  gap: ${spacing.space[16]};

  & > .line {
    border-radius: ${spacing.space[4]};
    display: inline-block;
    width: ${spacing.space[8]};
    height: 100%;
    background-color: ${myPalette("primary", 6)};
  }

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
  color: ${myPalette("secondary", 5)};
  /* background-color: ${myPalette("secondary", 1)}; */
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

export const StyledBlockquote = styled.blockquote`
  /* margin: 0; */
  padding: ${spacing.space[16]};
  border: 1px solid ${myPalette("gray", 3)};
  border-left: ${spacing.space[4]} solid ${myPalette("primary", 6)};
  border-radius: ${spacing.space[4]};
  color: ${myPalette("gray", 8)};
  font-size: ${typography.fontSizes["sm"]};
`;

export const StyledImg = styled.img`
  border-radius: ${spacing.space[8]} !important;
  border: 3px solid black;
`;
