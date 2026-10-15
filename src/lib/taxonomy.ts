import { CATEGORIES } from "../config/categories";

/** taxonomy 함수가 필요로 하는 최소한의 글 형태 (Astro 컬렉션 엔트리와 호환). */
export interface PostLike {
  slug: string;
  data: {
    title: string;
    date: Date;
    category: string;
    tags: string[];
    series?: string;
    seriesOrder?: number;
  };
}

export interface CategoryNode {
  name: string;
  label: string;
  /** URL 경로 세그먼트 (예: ["tech", "react"]) */
  path: string[];
  count: number;
  children: CategoryNode[];
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^\p{L}\p{N}.-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const categorySegments = (category: string) =>
  category.split("/").map((s) => s.trim()).filter(Boolean);

export const categoryLabel = (name: string, depth = 0) =>
  depth === 0 ? (CATEGORIES[name]?.label ?? name) : name;

/** "Tech/React" → "개발 / React" */
export const categoryDisplay = (category: string) =>
  categorySegments(category).map((s, i) => categoryLabel(s, i)).join(" / ");

export const categoryHref = (segments: string[]) =>
  `/categories/${segments.map(slugify).join("/")}/`;

export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function buildCategoryTree(posts: PostLike[]): CategoryNode[] {
  const roots: CategoryNode[] = [];
  for (const post of posts) {
    let level = roots;
    const segs = categorySegments(post.data.category);
    segs.forEach((name, depth) => {
      let node = level.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          label: categoryLabel(name, depth),
          path: segs.slice(0, depth + 1).map(slugify),
          count: 0,
          children: [],
        };
        level.push(node);
      }
      node.count++;
      level = node.children;
    });
  }
  const order = (n: CategoryNode) => CATEGORIES[n.name]?.order ?? 99;
  roots.sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
  const sortChildren = (nodes: CategoryNode[]) =>
    nodes.forEach((n) => {
      n.children.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      sortChildren(n.children);
    });
  sortChildren(roots);
  return roots;
}

/** 모든 카테고리 노드를 평탄화 (정적 경로 생성용) */
export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenCategories(n.children)]);
}

export function postsInCategory<T extends PostLike>(posts: T[], path: string[]): T[] {
  return posts.filter((p) => {
    const segs = categorySegments(p.data.category).map(slugify);
    return path.every((s, i) => segs[i] === s);
  });
}

export interface TagCount {
  tag: string;
  slug: string;
  count: number;
}

export function tagCounts(posts: PostLike[]): TagCount[] {
  const map = new Map<string, TagCount>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = slugify(tag);
      const entry = map.get(slug) ?? { tag: tag.toLowerCase(), slug, count: 0 };
      entry.count++;
      map.set(slug, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const postsWithTag = <T extends PostLike>(posts: T[], slug: string) =>
  posts.filter((p) => p.data.tags.some((t) => slugify(t) === slug));

export interface Series<T extends PostLike> {
  name: string;
  slug: string;
  posts: T[];
}

export function getSeries<T extends PostLike>(posts: T[]): Series<T>[] {
  const map = new Map<string, T[]>();
  for (const post of posts) {
    if (!post.data.series) continue;
    map.set(post.data.series, [...(map.get(post.data.series) ?? []), post]);
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      slug: slugify(name),
      posts: list.sort(
        (a, b) =>
          (a.data.seriesOrder ?? Infinity) - (b.data.seriesOrder ?? Infinity) ||
          a.data.date.getTime() - b.data.date.getTime(),
      ),
    }))
    .sort((a, b) => latest(b.posts) - latest(a.posts));
}

const latest = (posts: PostLike[]) => Math.max(...posts.map((p) => p.data.date.getTime()));

/** 태그 겹침(2점) + 같은 최상위 카테고리(1점) + 같은 하위 카테고리(1점)으로 점수를 매긴다. */
export function relatedPosts<T extends PostLike>(post: T, posts: T[], limit = 3): T[] {
  const tags = new Set(post.data.tags.map(slugify));
  const [top, sub] = categorySegments(post.data.category);
  const scored = posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      const [pTop, pSub] = categorySegments(p.data.category);
      const shared = p.data.tags.filter((t) => tags.has(slugify(t))).length;
      const score = shared * 2 + (pTop === top ? 1 : 0) + (sub && pSub === sub ? 1 : 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.data.date.getTime() - a.p.data.date.getTime());
  return scored.slice(0, limit).map((x) => x.p);
}

/** 날짜 내림차순 목록 기준 — prev는 더 오래된 글, next는 더 최신 글 */
export function prevNext<T extends PostLike>(post: T, sortedDesc: T[]) {
  const i = sortedDesc.findIndex((p) => p.slug === post.slug);
  return {
    prev: i >= 0 ? sortedDesc[i + 1] : undefined,
    next: i > 0 ? sortedDesc[i - 1] : undefined,
  };
}

export function groupByYear<T extends PostLike>(sortedDesc: T[]): { year: number; posts: T[] }[] {
  const groups: { year: number; posts: T[] }[] = [];
  for (const post of sortedDesc) {
    const year = post.data.date.getFullYear();
    const last = groups.at(-1);
    if (last?.year === year) last.posts.push(post);
    else groups.push({ year, posts: [post] });
  }
  return groups;
}
