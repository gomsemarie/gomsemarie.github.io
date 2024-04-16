import { makeVariantStyleModule } from "@_types";
import { css } from "styled-components";

type BreakpointsType =
  | "xxxl"
  | "xxl"
  | "xl"
  | "lg"
  | "md"
  | "sm"
  | "xs"
  | "xxs";
export const breakpoints: Record<BreakpointsType, number> = {
  xxxl: 1920,
  xxl: 1440,
  xl: 1024,
  lg: 768,
  md: 425,
  sm: 375,
  xs: 320,
  xxs: 280,
};

export const media = makeVariantStyleModule(
  breakpoints,
  (value, styles, ...interpolations) => css`
    @media (max-width: ${value}px) {
      ${css(styles, ...interpolations)}
    }
  `
);
