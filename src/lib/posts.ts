import { getCollection, type CollectionEntry } from "astro:content";
import getReadingTime from "reading-time";
import { sortByDateDesc } from "./taxonomy";

export type Post = CollectionEntry<"posts"> & { slug: string; minutesRead: number };

/** 한국어 어절 기준 분당 약 220어절. 최소 1분. */
export const readingMinutes = (text: string) =>
  Math.max(1, Math.round(getReadingTime(text, { wordsPerMinute: 220 }).minutes));

let cache: Post[] | undefined;

/** 날짜 내림차순 글 목록. 프로덕션 빌드에서는 draft를 제외한다. */
export async function getPosts(): Promise<Post[]> {
  if (cache) return cache;
  const entries = await getCollection("posts", (p) => (import.meta.env.PROD ? !p.data.draft : true));
  cache = sortByDateDesc(
    entries.map((p) => ({
      ...p,
      slug: p.data.slug ?? p.id.split("/").pop()!,
      minutesRead: readingMinutes(p.body ?? ""),
    })),
  );
  return cache;
}

export const postHref = (post: { slug: string }) => `/posts/${post.slug}/`;

const fmt = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });

/** 2025.03.10 */
export const formatDate = (d: Date) => fmt.format(d).replace(/\.\s?/g, ".").replace(/\.$/, "");

/** 03.10 */
export const formatMonthDay = (d: Date) => formatDate(d).slice(5);
