import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

const isBlank = (n: ElementContent) => n.type === "text" && n.value.trim() === "";

/**
 * 이미지 하나만 있는 문단을 `<figure>`로 감싸고, title(없으면 alt)을 캡션으로 붙인다.
 */
export function rehypeFigure() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "p" || !parent || index === undefined) return;
      const meaningful = node.children.filter((c) => !isBlank(c));
      const img = meaningful[0];
      if (meaningful.length !== 1 || img.type !== "element" || img.tagName !== "img") return;

      const caption = String(img.properties.title ?? img.properties.alt ?? "").trim();
      delete img.properties.title;

      const children: ElementContent[] = [img];
      if (caption) {
        children.push({
          type: "element",
          tagName: "figcaption",
          properties: {},
          children: [{ type: "text", value: caption }],
        });
      }
      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: { className: ["md-figure"] },
        children,
      };
    });
  };
}
