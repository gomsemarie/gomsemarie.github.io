import styled, { css } from "styled-components";

const clearUlCss = css`
  list-style: none;
  padding-inline-start: 0;
  margin-block-start: 0;
  margin-block-end: 0;
`;

export const ClearedUl = styled.ul`
  ${clearUlCss}

  & ul {
    ${clearUlCss}
  }

  & li {
    list-style: none;
    margin-block-start: 0;
    margin-block-end: 0;
  }
`;

export const ClearedLi = styled.li`
  & li {
    list-style: none;
    margin-block-start: 0;
    margin-block-end: 0;
  }
`;
