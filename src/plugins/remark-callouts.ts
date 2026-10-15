import type { Blockquote, Paragraph, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export const CALLOUT_LABELS = {
  note: "참고",
  tip: "팁",
  important: "중요",
  warning: "주의",
  caution: "위험",
} as const;

export type CalloutKind = keyof typeof CALLOUT_LABELS;

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)\n?/i;

/**
 * GitHub 스타일 알림(`> [!NOTE]`)을 `<aside class="callout" data-kind>`로 바꾼다.
 * 마커 뒤 같은 줄의 텍스트는 제목으로 쓰고, 없으면 기본 한글 라벨을 쓴다.
 */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (first?.type !== "paragraph") return;
      const head = first.children[0];
      if (head?.type !== "text") return;

      const match = head.value.match(MARKER);
      if (!match) return;

      const kind = match[1].toLowerCase() as CalloutKind;
      const title = match[2].trim() || CALLOUT_LABELS[kind];

      head.value = head.value.slice(match[0].length);
      if (head.value === "") first.children.shift();
      if (first.children.length === 0) node.children.shift();

      const titleNode: Paragraph = {
        type: "paragraph",
        children: [{ type: "text", value: title } as Text],
        data: { hProperties: { className: ["callout-title"] } },
      };
      node.children.unshift(titleNode);
      node.data = {
        ...node.data,
        hName: "aside",
        hProperties: { className: ["callout"], "data-kind": kind },
      };
    });
  };
}
