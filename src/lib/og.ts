import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import satori from "satori";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const fontPath = (weight: string) =>
  require.resolve(`pretendard/dist/public/static/alternative/Pretendard-${weight}.ttf`);

type Font = { name: string; data: Buffer; weight: 400 | 600 };
let fonts: Promise<Font[]> | undefined;

/** 제목용 Jua(한글 전체·라틴 woff) + 본문용 Pretendard */
async function loadJua(): Promise<Font[]> {
  const dir = join(dirname(require.resolve("@fontsource/jua/package.json")), "files");
  const files = ["jua-korean-400-normal.woff", "jua-latin-400-normal.woff"];
  return Promise.all(files.map(async (f) => ({ name: "Jua", data: await readFile(join(dir, f)), weight: 400 as const })));
}

const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(fontPath("Regular")).then((data) => ({ name: "Pretendard", data, weight: 400 as const })),
    readFile(fontPath("SemiBold")).then((data) => ({ name: "Pretendard", data, weight: 600 as const })),
    loadJua(),
  ]).then(([regular, semibold, jua]) => [regular, semibold, ...jua]));

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** 1200×630 OG 이미지 — Pastel Docs 기본 테마(파우더 블루 새벽) */
export async function renderOgImage({ title, eyebrow }: { title: string; eyebrow: string }) {
  const tree = h(
    "div",
    {
      width: 1200,
      height: 630,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 40,
      background: "#edf4ff",
      fontFamily: "Pretendard",
    },
    [
      h(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 1120,
          height: 550,
          boxSizing: "border-box",
          padding: "56px 64px",
          background: "#ffffff",
          border: "2px solid #e5efff",
          borderRadius: 40,
          color: "#25304a",
        },
        [
          h("div", { display: "flex", alignItems: "center", gap: 20 }, [
            h("div", { display: "flex", gap: 10 }, [
              h("div", { width: 18, height: 18, borderRadius: 999, background: "#cfe2ff" }),
              h("div", { width: 18, height: 18, borderRadius: 999, background: "#e6f7e9" }),
              h("div", { width: 18, height: 18, borderRadius: 999, background: "#f7ddf0" }),
            ]),
            h("div", { display: "flex", fontSize: 26, fontWeight: 600, color: "#3b5d91", background: "#edf4ff", padding: "6px 20px", borderRadius: 999 }, eyebrow),
          ]),
          h(
            "div",
            { display: "flex", width: 990, fontFamily: "Jua", fontSize: title.length > 30 ? 60 : 70, lineHeight: 1.3, wordBreak: "keep-all" },
            title,
          ),
          h("div", { display: "flex", width: 990, justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#586178" }, [
            h("div", { display: "flex", fontFamily: "Jua", fontSize: 32, color: "#25304a" }, "gomsemarie"),
            h("div", { display: "flex" }, "gomsemarie.github.io"),
          ]),
        ],
      ),
    ],
  );

  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
