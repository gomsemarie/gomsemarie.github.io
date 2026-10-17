/** 디자인 시스템 역할 색. 카테고리 태그와 점에 쓴다. */
export type CategoryRole = "primary" | "tip" | "note" | "caution" | "danger";

/** 최상위 카테고리 메타. 하위 카테고리는 frontmatter 값이 그대로 라벨이 된다. */
export const CATEGORIES: Record<string, { label: string; order: number; role: CategoryRole }> = {
  Tech: { label: "개발", order: 1, role: "primary" },
  Infra: { label: "인프라", order: 2, role: "tip" },
  DevOps: { label: "DevOps", order: 3, role: "note" },
  Tools: { label: "도구", order: 4, role: "caution" },
  Trend: { label: "트렌드", order: 5, role: "danger" },
};

/** Tailwind가 찾을 수 있도록 클래스 이름을 그대로 적어 둔다 */
export const ROLE_CLASSES: Record<CategoryRole, { tag: string; dot: string }> = {
  primary: { tag: "bg-primary-soft text-primary-ink", dot: "bg-primary-ink/40" },
  tip: { tag: "bg-tip-soft text-tip-ink", dot: "bg-tip-ink/40" },
  note: { tag: "bg-note-soft text-note-ink", dot: "bg-note-ink/40" },
  caution: { tag: "bg-caution-soft text-caution-ink", dot: "bg-caution-ink/40" },
  danger: { tag: "bg-danger-soft text-danger-ink", dot: "bg-danger-ink/40" },
};

/** "Tech/React" 같은 카테고리 경로의 역할 색 클래스 */
export const categoryRole = (category: string) => ROLE_CLASSES[CATEGORIES[category.split("/")[0].trim()]?.role ?? "primary"];
