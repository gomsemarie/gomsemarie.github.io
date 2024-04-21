import styled, { css } from "styled-components";
import { palette } from "styled-tools";

const borderDesign = css`
  border-top: 10px solid ${palette("primary", 1)};
`;

export const PostNavigatorUl = styled.ul`
  ${borderDesign}
`;
