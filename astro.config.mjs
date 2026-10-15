// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";
import { unified, rehypeHeadingIds } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { remarkCallouts } from "./src/plugins/remark-callouts.ts";
import { rehypeFigure } from "./src/plugins/rehype-figure.ts";

export default defineConfig({
  site: "https://gomsemarie.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [
    // Expressive Code는 mdx보다 먼저 등록해야 한다
    expressiveCode({
      themes: ["github-light", "github-dark"],
      themeCssSelector: (theme) =>
        theme.type === "dark" ? ".dark" : ":root:not(.dark)",
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
    }),
    mdx(),
    react(),
    sitemap(),
    pagefind(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkCallouts],
      rehypePlugins: [
        rehypeHeadingIds,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "prepend",
            properties: { className: ["heading-anchor"], ariaLabel: "이 제목으로 링크", tabIndex: -1, dataPagefindIgnore: "" },
            content: { type: "text", value: "#" },
            test: ["h2", "h3", "h4"],
          },
        ],
        [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
        rehypeFigure,
      ],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
