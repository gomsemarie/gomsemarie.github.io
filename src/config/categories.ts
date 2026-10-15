/** 최상위 카테고리 메타. 하위 카테고리는 frontmatter 값이 그대로 라벨이 된다. */
export const CATEGORIES: Record<string, { label: string; order: number }> = {
  Tech: { label: "개발", order: 1 },
  Infra: { label: "인프라", order: 2 },
  DevOps: { label: "DevOps", order: 3 },
  Tools: { label: "도구", order: 4 },
  Trend: { label: "트렌드", order: 5 },
};
