import React from "react";
import { Link } from "gatsby";
import { Icon } from "@iconify/react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@_components/ui/card";
import { cn } from "../../lib/utils";
import { getCategoryGradient, getCategoryDotColor } from "../../types/homepage";

export type PostFrontmatter = {
  slug: string | null;
  date: string | null;
  title: string | null;
  description: string | null;
  tags: ReadonlyArray<string | null> | null;
  category: string | null;
  thumbnail: string | null;
};

interface RecentPostsProps {
  posts: ReadonlyArray<{ frontmatter: PostFrontmatter | null }>;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  frontmatter: PostFrontmatter;
}

function PostCard({ frontmatter }: PostCardProps) {
  const { slug, date, title, description, category, thumbnail } = frontmatter;
  const href = `/posts/${slug}/`;
  const gradient = getCategoryGradient(category);
  const { dot: dotColor, text: catTextColor } = getCategoryDotColor(category);

  return (
    <Link to={href} className="group block h-full no-underline">
      <Card
        className={cn(
          "h-full flex flex-col overflow-hidden",
          "border border-border/50",
          "transition-all duration-250",
          "hover:shadow-xl hover:-translate-y-1.5 hover:border-border"
        )}
      >
        {/* Thumbnail — aspect-video, thumbnail scales on hover */}
        <div className="relative w-full aspect-video overflow-hidden shrink-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title ?? "post thumbnail"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br",
                gradient,
                "flex items-center justify-center"
              )}
            >
              {category && (
                <span className="font-maple text-3xl text-gray-400/50 select-none">
                  {category.charAt(0)}
                </span>
              )}
            </div>
          )}

          {/* Subtle shimmer gradient at bottom of thumbnail for text legibility */}
          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
        </div>

        <CardHeader className="pb-1 pt-4">
          {/* Category: coloured dot + text — replaces the Badge */}
          {category && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
              <span className={cn("font-sans text-xs font-medium", catTextColor)}>
                {category}
              </span>
            </div>
          )}

          <CardTitle
            className={cn(
              "font-maple text-lg leading-snug",
              "line-clamp-2",
              "group-hover:text-primary transition-colors duration-200"
            )}
          >
            {title}
          </CardTitle>
        </CardHeader>

        {description && (
          <CardContent className="flex-1 pt-0 pb-2">
            <CardDescription className="font-sans text-xs line-clamp-2 leading-relaxed">
              {description}
            </CardDescription>
          </CardContent>
        )}

        <CardFooter className="pt-0 pb-4 mt-auto">
          {date && (
            <span className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
              <Icon icon="mdi:calendar-outline" width={12} className="shrink-0" />
              {date}
            </span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

// ─── RecentPosts ──────────────────────────────────────────────────────────────

export function RecentPosts({ posts }: RecentPostsProps) {
  const recent = posts.slice(0, 6);

  return (
    <section className="w-full py-14 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-maple text-2xl md:text-3xl text-foreground leading-tight">
              최근 포스트
            </h2>
            {/* Count badge */}
            {recent.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "min-w-[28px] h-7 px-2 rounded-full",
                  "bg-muted text-muted-foreground",
                  "font-sans text-xs font-bold",
                  "tabular-nums"
                )}
              >
                {recent.length}
              </span>
            )}
          </div>

          <Link
            to="/posts/"
            className={cn(
              "flex items-center gap-1.5 text-sm font-sans shrink-0",
              "text-muted-foreground hover:text-foreground",
              "transition-colors no-underline group"
            )}
          >
            모든 포스트 보기
            <Icon
              icon="mdi:arrow-right"
              width={14}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Grid */}
        {recent.length > 0 ? (
          <div
            className={cn(
              "grid gap-5",
              "grid-cols-1",
              "sm:grid-cols-2",
              "lg:grid-cols-3"
            )}
          >
            {recent.map((post) => {
              if (!post.frontmatter || !post.frontmatter.slug) return null;
              return (
                <PostCard
                  key={post.frontmatter.slug}
                  frontmatter={post.frontmatter as PostFrontmatter}
                />
              );
            })}
          </div>
        ) : (
          <p className="font-sans text-sm text-muted-foreground text-center py-16">
            아직 작성된 포스트가 없습니다.
          </p>
        )}

        {/* Bottom CTA (mobile convenience) */}
        <div className="flex justify-center mt-12">
          <Link
            to="/posts/"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3",
              "border border-border rounded-full",
              "text-sm font-sans text-foreground",
              "hover:bg-muted hover:text-foreground",
              "transition-all duration-200 no-underline group"
            )}
          >
            모든 포스트 보기
            <Icon
              icon="mdi:arrow-right"
              width={14}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default RecentPosts;
