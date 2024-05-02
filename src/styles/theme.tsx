import { TupleIndices } from "@_types";
import { ThemeWithPalette, palette } from "styled-tools";

export const myPalette: MyPalette = ((a, b, c) =>
  palette(a, b, c)) as MyPalette;

type PaletteKey = keyof (typeof lightThemeType)["palette"];
type PaletteTone<KEY extends PaletteKey> = TupleIndices<
  (typeof lightThemeType)["palette"][KEY]
>;

interface MyPalette {
  (tone?: number): <Props, Theme extends ThemeWithPalette>(
    props: Props & {
      theme: Theme;
      palette?: keyof Theme["palette"];
      tone?: number;
    }
  ) => string;

  (tone: number, defaultValue: string): <Props, Theme extends ThemeWithPalette>(
    props: Props & { theme: Partial<Theme>; palette?: keyof Theme["palette"] }
  ) => string;

  <KEY extends PaletteKey, TONE extends PaletteTone<KEY>>(
    key: KEY,
    tone?: TONE
  ): <Props, Theme extends ThemeWithPalette>(
    props: Props & { theme: Theme; tone?: TONE }
  ) => string;

  <KEY extends PaletteKey, TONE extends PaletteTone<KEY>>(
    key: KEY,
    defaultValue?: string
  ): <Props, Theme extends ThemeWithPalette>(
    props: Props & { theme: Theme; tone?: TONE }
  ) => string;

  <KEY extends PaletteKey, TONE extends PaletteTone<KEY>>(
    key: KEY,
    tone: TONE,
    defaultValue?: string
  ): <Props, Theme extends ThemeWithPalette>(
    props: Props & { theme: Theme }
  ) => string;
}

const darkThemeType = {
  palette: {},
};
const lightThemeType = {
  palette: {
    black: ["#000000"],
    white: ["#FFFFFF"],
    gray: [
      "#F7FAFC",
      "#EDF2F7",
      "#E2E8F0",
      "#CBD5E0",
      "#A0AEC0",
      "#718096",
      "#4A5568",
      "#2D3748",
      "#1A202C",
      "#171923",
    ],
    red: [
      "#FFF5F5",
      "#FED7D7",
      "#FEB2B2",
      "#FC8181",
      "#F56565",
      "#E53E3E",
      "#C53030",
      "#9B2C2C",
      "#822727",
      "#63171B",
    ],
    orange: [
      "#FFFAF0",
      "#FEEBC8",
      "#FBD38D",
      "#F6AD55",
      "#ED8936",
      "#DD6B20",
      "#C05621",
      "#9C4221",
      "#7B341E",
      "#652B19",
    ],
    yellow: [
      "#FFFFF0",
      "#FEFCBF",
      "#FAF089",
      "#F6E05E",
      "#ECC94B",
      "#D69E2E",
      "#B7791F",
      "#975A16",
      "#744210",
      "#5F370E",
    ],
    green: [
      "#F0FFF4",
      "#C6F6D5",
      "#9AE6B4",
      "#68D391",
      "#48BB78",
      "#38A169",
      "#2F855A",
      "#276749",
      "#22543D",
      "#1C4532",
    ],
    teal: [
      "#E6FFFA",
      "#B2F5EA",
      "#81E6D9",
      "#4FD1C5",
      "#38B2AC",
      "#319795",
      "#2C7A7B",
      "#285E61",
      "#234E52",
      "#1D4044",
    ],
    blue: [
      "#EBF8FF",
      "#BEE3F8",
      "#90CDF4",
      "#63B3ED",
      "#4299E1",
      "#3182CE",
      "#2B6CB0",
      "#2C5282",
      "#2A4365",
      "#1A365D",
    ],
    cyan: [
      "#EDFDFD",
      "#C4F1F9",
      "#9DECF9",
      "#76E4F7",
      "#0BC5EA",
      "#00B5D8",
      "#00A3C4",
      "#0987A0",
      "#086F83",
      "#065666",
    ],
    purple: [
      "#FAF5FF",
      "#E9D8FD",
      "#D6BCFA",
      "#B794F4",
      "#9F7AEA",
      "#805AD5",
      "#6B46C1",
      "#553C9A",
      "#44337A",
      "#322659",
    ],
    pink: [
      "#FFF5F7",
      "#FED7E2",
      "#FBB6CE",
      "#F687B3",
      "#ED64A6",
      "#D53F8C",
      "#B83280",
      "#97266D",
      "#702459",
      "#521B41",
    ],
  },
} as const;
export const lightTheme: ThemeWithPalette = lightThemeType;
export const dartTheme: ThemeWithPalette = darkThemeType;
