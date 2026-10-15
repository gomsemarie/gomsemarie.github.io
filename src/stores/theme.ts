import { create } from "zustand";

export type Theme = "light" | "dark";

const currentTheme = (): Theme =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

/**
 * 테마 상태. 첫 페인트 전 적용은 BaseLayout의 인라인 스크립트가 맡고,
 * 이 스토어는 토글과 구독(Giscus 등)을 담당한다. 아일랜드끼리 같은 모듈 인스턴스를 공유한다.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: currentTheme(),
  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // 저장소 접근이 막힌 환경에서는 이번 세션에만 적용
    }
    set({ theme });
  },
  toggle: () => get().setTheme(currentTheme() === "dark" ? "light" : "dark"),
}));
