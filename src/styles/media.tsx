import { makeVariantStyleModule } from "@_types";
import { css } from "styled-components";

type BreakpointsType = "xxl" | "xl" | "lg" | "md" | "sm";
const breakpoints: Record<BreakpointsType, number> = {
  xxl: 1400,
  xl: 1200,
  lg: 992,
  md: 768,
  sm: 576,
};

export const media = makeVariantStyleModule(
  breakpoints,
  (value, styles, ...interpolations) => css`
    @media (max-width: ${value}px) {
      ${css(styles, ...interpolations)}
    }
  `
);
