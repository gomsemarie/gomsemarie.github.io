import type { APIRoute, GetStaticPaths } from "astro";
import { SITE } from "@/config/site";
import { getPosts } from "@/lib/posts";
import { renderOgImage } from "@/lib/og";
import { categoryDisplay } from "@/lib/taxonomy";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts();
  return [
    { params: { slug: "default" }, props: { title: "만들면서 배운 것들을 천천히 기록합니다.", eyebrow: SITE.description } },
    ...posts.map((p) => ({
      params: { slug: p.slug },
      props: { title: p.data.title, eyebrow: categoryDisplay(p.data.category) },
    })),
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props as { title: string; eyebrow: string });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
