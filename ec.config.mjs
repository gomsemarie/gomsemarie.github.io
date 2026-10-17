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
  // Pastel Docs 코드 블록: surface-sunken 우물 + 네 변 1.5px line + radius-md(16px)
  styleOverrides: {
    borderRadius: "16px",
    borderWidth: "1.5px",
    borderColor: "var(--line)",
    codeBackground: "var(--surface-sunken)",
    codeFontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
    codeFontSize: "13.5px",
    codeLineHeight: "1.7",
    codePaddingInline: "18px",
    uiFontFamily: "'IBM Plex Sans KR', system-ui, sans-serif",
    frames: {
      editorTabBarBackground: "var(--surface)",
      editorActiveTabBackground: "var(--surface-sunken)",
      editorActiveTabIndicatorTopColor: "transparent",
      editorActiveTabIndicatorBottomColor: "var(--primary)",
      editorTabBarBorderBottomColor: "var(--line)",
      terminalTitlebarBackground: "var(--surface)",
      terminalTitlebarBorderBottomColor: "var(--line)",
      terminalBackground: "var(--surface-sunken)",
      inlineButtonBackground: "var(--primary)",
      inlineButtonForeground: "var(--on-primary)",
      inlineButtonBorder: "var(--line-strong)",
      tooltipSuccessBackground: "var(--primary-ink)",
      frameBoxShadowCssValue: "none",
    },
  },
  defaultProps: { wrap: false },
});
