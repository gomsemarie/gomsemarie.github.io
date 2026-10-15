// @ts-check
import { defineEcConfig, pluginFramesTexts } from "astro-expressive-code";

// 코드블록 UI 문구 한국어화
pluginFramesTexts.overrideTexts(undefined, {
  terminalWindowFallbackTitle: "터미널",
  copyButtonTooltip: "코드 복사",
  copyButtonCopied: "복사됨",
});

export default defineEcConfig({
  defaultLocale: "ko",
  themes: ["github-light", "github-dark"],
  themeCssSelector: (theme) => (theme.type === "dark" ? ".dark" : ":root:not(.dark)"),
  useDarkModeMediaQuery: false,
  styleOverrides: {
    borderRadius: "12px",
    borderColor: "var(--border)",
    codeFontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
    codeFontSize: "14px",
    codeLineHeight: "1.75",
    uiFontFamily: "'Pretendard Variable', Pretendard, sans-serif",
    frames: {
      editorActiveTabBackground: "var(--muted)",
      editorTabBarBackground: "var(--muted)",
      terminalTitlebarBackground: "var(--muted)",
      frameBoxShadowCssValue: "none",
    },
  },
  defaultProps: { wrap: false },
});
