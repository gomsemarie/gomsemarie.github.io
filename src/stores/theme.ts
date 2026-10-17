import { create } from "zustand";

export type Theme = "light" | "dark";

/** Pastel Docs 색 테마 6종 (기본: blue) */
export const PALETTES = [
  { id: "blue", name: "파우더 블루 새벽", swatch: "#cfe2ff" },
  { id: "lavender", name: "라벤더 밀크", swatch: "#d9c2f0" },
  { id: "cotton", name: "솜사탕 안개", swatch: "#f7c8d8" },
  { id: "mint", name: "민트 마카롱", swatch: "#bcead5" },
  { id: "peach", name: "복숭아 셔벗", swatch: "#ffd1ba" },
  { id: "rose", name: "로즈 쿼츠 글로우", swatch: "#f6c2d0" },
] as const;

export type Palette = (typeof PALETTES)[number]["id"];

const root = () => (typeof document !== "undefined" ? document.documentElement : undefined);

const currentTheme = (): Theme => (root()?.classList.contains("dark") ? "dark" : "light");
const currentPalette = (): Palette => (root()?.dataset.palette as Palette | undefined) ?? "blue";

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소 접근이 막힌 환경에서는 이번 세션에만 적용
  }
};

interface ThemeState {
  theme: Theme;
  palette: Palette;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  setPalette: (palette: Palette) => void;
}

/**
 * 테마(라이트/다크)와 색 테마(palette) 상태. 첫 페인트 전 적용은 BaseLayout의 인라인 스크립트가 맡고,
 * 이 스토어는 변경과 구독(Giscus 등)을 담당한다. 아일랜드끼리 같은 모듈 인스턴스를 공유한다.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: currentTheme(),
  palette: currentPalette(),
  setTheme: (theme) => {
    root()?.classList.toggle("dark", theme === "dark");
    save("theme", theme);
    set({ theme });
  },
  toggle: () => get().setTheme(currentTheme() === "dark" ? "light" : "dark"),
  setPalette: (palette) => {
    const el = root();
    if (el) el.dataset.palette = palette;
    save("palette", palette);
    set({ palette });
  },
}));
