import { myPalette, spacing, typography } from "@_styles";
import styled from "styled-components";
import { prop } from "styled-tools";

interface TagSpanProps {
  color?: React.CSSProperties["color"];
}
export const TagSpan = styled.span<TagSpanProps>`
  display: inline-block;
  padding: ${spacing.space[2]} ${spacing.space[12]};
  background-color: ${prop("color", myPalette("blue", 0))};
  border-radius: ${spacing.space[16]};
  font-family: ${typography.fonts.mapleLight};
  font-size: ${typography.fontSizes["xs"]};
  color: ${myPalette("gray", 7)};
`;
