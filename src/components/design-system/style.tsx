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

export const StyledIngredient = styled.div`
  border-radius: ${spacing.space[8]};
  padding: ${spacing.space[16]} ${spacing.space[16]};
  margin: ${spacing.space[16]} 0;
  box-shadow: rgba(9, 30, 66, 0.25) 0px 4px 8px -2px,
    rgba(9, 30, 66, 0.08) 0px 0px 0px 1px;

  display: grid;
  grid-template-columns: auto 100px;
  align-items: center;

  & p {
    margin: 0;
  }

  & > .name-area {
    & > p {
      font-family: ${typography.fonts.mapleBold};
      font-size: ${typography.fontSizes["lg"]};
      color: ${myPalette("gray", 8)};
    }
  }
  & > .volume-area {
    & > p {
      font-family: ${typography.fonts.mapleBold};
      font-size: ${typography.fontSizes["md"]};
      color: ${myPalette("gray", 8)};

      &:not(.fill-up):after {
        content: " ml";
      }

      &.fill-up {
        color: ${myPalette("blue", 6)};
      }
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

export const StyledStarRating = styled.div`
  padding: 0 ${spacing.space[20]};
  display: flex;
  justify-content: center;

  .feedback {
    max-width: 360px;
    background-color: #fff;
    width: 100%;
  }

  .rating {
    display: flex;
    width: 100%;
    justify-content: center;
    overflow: hidden;
    flex-direction: row-reverse;
    height: 150px;
    position: relative;
  }

  .rating-0 {
    filter: grayscale(100%);
  }

  .rating > input {
    display: none;
  }

  .rating > label {
    width: 40px;
    height: 40px;
    margin-top: auto;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='126.729' height='126.73'%3e%3cpath fill='%23e3e3e3' d='M121.215 44.212l-34.899-3.3c-2.2-.2-4.101-1.6-5-3.7l-12.5-30.3c-2-5-9.101-5-11.101 0l-12.4 30.3c-.8 2.1-2.8 3.5-5 3.7l-34.9 3.3c-5.2.5-7.3 7-3.4 10.5l26.3 23.1c1.7 1.5 2.4 3.7 1.9 5.9l-7.9 32.399c-1.2 5.101 4.3 9.3 8.9 6.601l29.1-17.101c1.9-1.1 4.2-1.1 6.1 0l29.101 17.101c4.6 2.699 10.1-1.4 8.899-6.601l-7.8-32.399c-.5-2.2.2-4.4 1.9-5.9l26.3-23.1c3.8-3.5 1.6-10-3.6-10.5z'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 76%;
    transition: 0.3s;
  }

  .rating > label.checked,
  .rating > label.checked ~ label {
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='126.729' height='126.73'%3e%3cpath fill='%23fcd93a' d='M121.215 44.212l-34.899-3.3c-2.2-.2-4.101-1.6-5-3.7l-12.5-30.3c-2-5-9.101-5-11.101 0l-12.4 30.3c-.8 2.1-2.8 3.5-5 3.7l-34.9 3.3c-5.2.5-7.3 7-3.4 10.5l26.3 23.1c1.7 1.5 2.4 3.7 1.9 5.9l-7.9 32.399c-1.2 5.101 4.3 9.3 8.9 6.601l29.1-17.101c1.9-1.1 4.2-1.1 6.1 0l29.101 17.101c4.6 2.699 10.1-1.4 8.899-6.601l-7.8-32.399c-.5-2.2.2-4.4 1.9-5.9l26.3-23.1c3.8-3.5 1.6-10-3.6-10.5z'/%3e%3c/svg%3e");
  }

  .emoji-wrapper {
    width: 100%;
    text-align: center;
    height: 100px;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
  }

  .emoji-wrapper:before,
  .emoji-wrapper:after {
    content: "";
    height: 15px;
    width: 100%;
    position: absolute;
    left: 0;
    z-index: 1;
  }

  .emoji-wrapper:before {
    top: 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 1) 35%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .emoji-wrapper:after {
    bottom: 0;
    background: linear-gradient(
      to top,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 1) 35%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .emoji {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: 0.3s;
  }

  .emoji > svg {
    margin: 15px 0;
    width: 70px;
    height: 70px;
    flex-shrink: 0;
  }

  label.rating-1.checked ~ .emoji-wrapper > .emoji {
    transform: translateY(-100px);
  }
  label.rating-2.checked ~ .emoji-wrapper > .emoji {
    transform: translateY(-200px);
  }
  label.rating-3.checked ~ .emoji-wrapper > .emoji {
    transform: translateY(-300px);
  }
  label.rating-4.checked ~ .emoji-wrapper > .emoji {
    transform: translateY(-400px);
  }
  label.rating-5.checked ~ .emoji-wrapper > .emoji {
    transform: translateY(-500px);
  }
`;
