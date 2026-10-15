import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const fontPath = (weight: string) =>
  require.resolve(`pretendard/dist/public/static/alternative/Pretendard-${weight}.ttf`);

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700 }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(fontPath("Regular")).then((data) => ({ name: "Pretendard", data, weight: 400 as const })),
    readFile(fontPath("Bold")).then((data) => ({ name: "Pretendard", data, weight: 700 as const })),
  ]));

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** 1200×630 OG 이미지 (라이트 테마, 미니멀 타이포) */
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
      padding: "72px 80px",
      background: "#FBFBFA",
      color: "#18181B",
      fontFamily: "Pretendard",
      borderTop: "12px solid #A8336A",
    },
    [
      h("div", { display: "flex", fontSize: 30, color: "#A8336A", fontWeight: 700 }, eyebrow),
      h(
        "div",
        { display: "flex", width: 1040, fontSize: title.length > 30 ? 60 : 72, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.03em", wordBreak: "keep-all" },
        title,
      ),
      h("div", { display: "flex", width: 1040, justifyContent: "space-between", fontSize: 28, color: "#63636B" }, [
        h("div", { display: "flex" }, [h("span", {}, "gomsemarie"), h("span", { color: "#A8336A" }, ".")]),
        h("div", { display: "flex" }, "gomsemarie.github.io"),
      ]),
    ],
  );

  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
