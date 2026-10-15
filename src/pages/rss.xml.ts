import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE } from "@/config/site";
import { getPosts, postHref } from "@/lib/posts";
import { categoryDisplay } from "@/lib/taxonomy";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postHref(post),
      categories: [categoryDisplay(post.data.category), ...post.data.tags],
    })),
    customData: "<language>ko-kr</language>",
  });
}
