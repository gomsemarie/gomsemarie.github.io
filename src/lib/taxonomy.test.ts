import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  categoryDisplay,
  getSeries,
  groupByYear,
  postsInCategory,
  prevNext,
  relatedPosts,
  slugify,
  sortByDateDesc,
  tagCounts,
  type PostLike,
} from "./taxonomy";

const post = (slug: string, date: string, category: string, tags: string[] = [], extra: Partial<PostLike["data"]> = {}): PostLike => ({
  slug,
  data: { title: slug, date: new Date(date), category, tags, ...extra },
});

const posts = [
  post("react-19", "2025-03-10", "Tech/React", ["react", "hooks"]),
  post("next", "2025-01-15", "Tech/Next.js", ["react", "nextjs"]),
  post("k8s", "2025-02-10", "Infra/Kubernetes", ["devops"], { series: "배포 시리즈", seriesOrder: 2 }),
  post("vercel", "2025-01-28", "DevOps/Vercel", ["devops", "nextjs"], { series: "배포 시리즈", seriesOrder: 1 }),
  post("gatsby", "2024-03-28", "Tech/Gatsby", ["React"]),
];

describe("slugify", () => {
  it("소문자·하이픈으로 만들고 한글은 유지한다", () => {
    expect(slugify("Server Components")).toBe("server-components");
    expect(slugify("Next.js")).toBe("next.js");
    expect(slugify("프론트엔드 개발자의 배포")).toBe("프론트엔드-개발자의-배포");
  });
});

describe("카테고리", () => {
  it("최상위는 한글 라벨, 설정 순서로 정렬된 트리를 만든다", () => {
    const tree = buildCategoryTree(posts);
    expect(tree.map((n) => n.label)).toEqual(["개발", "인프라", "DevOps"]);
    expect(tree[0].count).toBe(3);
    expect(tree[0].children.map((c) => c.path.join("/"))).toContain("tech/react");
  });

  it("경로 접두사로 글을 거른다", () => {
    expect(postsInCategory(posts, ["tech"]).length).toBe(3);
    expect(postsInCategory(posts, ["tech", "react"]).map((p) => p.slug)).toEqual(["react-19"]);
  });

  it("표시용 문자열을 만든다", () => {
    expect(categoryDisplay("Tech/React")).toBe("개발 / React");
  });
});

describe("태그·시리즈", () => {
  it("대소문자 구분 없이 태그 수를 센다", () => {
    expect(tagCounts(posts)[0]).toEqual({ tag: "react", slug: "react", count: 3 });
  });

  it("시리즈를 seriesOrder 순으로 묶는다", () => {
    const [s] = getSeries(posts);
    expect(s.slug).toBe("배포-시리즈");
    expect(s.posts.map((p) => p.slug)).toEqual(["vercel", "k8s"]);
  });
});

describe("탐색", () => {
  const sorted = sortByDateDesc(posts);

  it("관련 글은 자기 자신을 빼고 점수순으로 고른다", () => {
    expect(relatedPosts(posts[0], posts).map((p) => p.slug)).toEqual(["next", "gatsby"]);
  });

  it("prev는 더 오래된 글, next는 더 최신 글이다", () => {
    const { prev, next } = prevNext(posts[2], sorted);
    expect(prev?.slug).toBe("vercel");
    expect(next?.slug).toBe("react-19");
    expect(prevNext(sorted[0], sorted).next).toBeUndefined();
  });

  it("연도별로 묶는다", () => {
    expect(groupByYear(sorted).map((g) => [g.year, g.posts.length])).toEqual([[2025, 4], [2024, 1]]);
  });
});
