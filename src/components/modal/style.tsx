import { myPalette, spacing, typography } from "@_styles";
import { rgba } from "polished";
import styled from "styled-components";

export const ModalDiv = styled.div`
  z-index: 100;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: none;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) =>
    rgba(myPalette("gray", 9)({ theme }), 0.5)};

  & > .modal-contents-area {
    min-width: 100px;
    min-height: 100px;
    position: relative;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
      rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    // border-radius: 10px;
    background-color: ${myPalette("white")};
    overflow: hidden;

    & > .modal-title-area {
      position: absolute;
      top: 0;
      right: 0;

      & > p {
        margin: 0;
      }
      & > button.close-button {
        border: 0;
        padding: 1rem;
        cursor: pointer;
      }

      &.use-title {
        background-color: ${myPalette("gray")};
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;

        & > p {
          padding: ${spacing.space[10]};
          font-family: ${typography.fonts.nanumGothicBold};
          font-size: ${typography.fontSizes["sm"]};
        }

        & > button {
          margin-left: auto;
        }
      }
    }
  }

  &.opened {
    display: flex;
  }
`;

export const NavigatorArticle = styled.article`
  padding: ${spacing.space[64]} ${spacing.space[20]};
`;
