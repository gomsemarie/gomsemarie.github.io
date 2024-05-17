import { css } from "styled-components";

export const textEllipsisCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: break-all;
`;

export const textEllipsis2Css = css`
  ${textEllipsisCss}

  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;
