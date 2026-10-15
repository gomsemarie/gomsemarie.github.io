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
  // 공용 CSS를 HTML에 넣어 렌더링을 막는 추가 요청을 없앤다
  build: { inlineStylesheets: "always" },
  integrations: [
    // Expressive Code는 mdx보다 먼저 등록해야 한다
    expressiveCode(), // 설정은 ec.config.mjs
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
