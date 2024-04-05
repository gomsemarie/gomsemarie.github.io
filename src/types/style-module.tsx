import { css } from "styled-components";
import { Interpolation, RuleSet, Styles } from "styled-components/dist/types";

type KeyType = string | number | symbol;
export type StyleModule = { styler: typeof css };
export type VariantStyleModules<T extends KeyType> = Record<T, StyleModule>;

export function makeVariantStyleModule<T extends KeyType>(
  variation: Record<T, string | number>,
  style: (
    value: string | number,
    styles: Styles<object>,
    ...interpolations: Interpolation<object>[]
  ) => RuleSet<object>
) {
  return Object.entries(variation).reduce((acc, [key, value]) => {
    return {
      ...acc,
      [key]: {
        styler: (
          styles: Styles<object>,
          ...interpolations: Interpolation<object>[]
        ) => style(value as string | number, styles, ...interpolations),
      },
    };
  }, {} as VariantStyleModules<T>);
}
