import {
  boxShadowCss,
  myPalette,
  spacing,
  textEllipsis2Css,
  typography,
} from "@_styles";
import styled from "styled-components";

const githubProfileSize = "32px";
export const PostCardDiv = styled.div`
  display: grid;
  grid-template-rows: 200px auto;
  border-radius: ${spacing.space[16]};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  position: relative;
  animation: appear 0.4s ease-in-out;

  ${boxShadowCss}

  @keyframes appear {
    0% {
      opacity: 0;
      top: -${spacing.space[16]};
    }
    100% {
      opacity: 1;
      top: 0;
    }
  }

  & > .thumbnail-area {
    background-color: ${myPalette("gray", 1)};
    overflow: hidden;

    & > img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease-in-out;
    }
  }
  & > .contents-area {
    display: grid;
    grid-template-rows: max-content max-content auto max-content;
    align-items: center;
    gap: ${spacing.space[16]};
    padding: ${spacing.space[16]};

    & > .tag-box {
      display: flex;
      flex-wrap: wrap;
      gap: ${spacing.space[4]};
    }
    & > .title-box {
      & > p {
        & > .icon {
          margin-right: ${spacing.space[4]};
        }
        margin: 0;
        font-family: ${typography.fonts.mapleLight};
        font-size: ${typography.fontSizes.md};
        color: ${myPalette("gray", 7)};

        ${textEllipsis2Css}
      }
    }
    & > .desc-box {
      align-self: baseline;
      & > p {
        margin: 0;
        font-size: ${typography.fontSizes.sm};
        color: ${myPalette("gray", 5)};

        ${textEllipsis2Css}
      }
    }
    & > .writer-info-box {
      display: grid;
      grid-template-columns: ${githubProfileSize} auto;
      align-items: center;
      gap: ${spacing.space[16]};

      & > img {
        width: ${githubProfileSize};
        height: ${githubProfileSize};
        border-radius: 50%;
        object-fit: cover;
      }
      & > p {
        font-size: ${typography.fontSizes.sm};
        color: ${myPalette("gray", 7)};
      }
    }
  }

  &:hover {
    transform: translateY(-${spacing.space[8]});

    & > .thumbnail-area {
      & > img {
        transform: scale(1.2);
      }
    }
  }
`;
