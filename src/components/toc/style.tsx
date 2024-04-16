import { boxShadow, buttonShadow } from "@_styles";
import styled from "styled-components";

export const TocDiv = styled.div``;

export const TocIconDiv = styled.div`
  & > button.open-button {
    border: 0;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;

    ${buttonShadow}
  }

  & > .toc-box {
    position: relative;
    padding: 10px;
    /* left: 100%;
    opacity: 0; */
    background-color: white;
    border-radius: 10px;
    transition: all 0.2s;
    ${boxShadow}

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
  padding-left: 10px;
  font-weight: normal;

  & > li {
    & > a {
      text-decoration: none;
      color: black;

      &.selected {
        color: brown !important;
      }
    }
  }
`;
