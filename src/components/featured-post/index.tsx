import React from "react";
import { Link } from "gatsby";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import {
  PostNode,
  getCategoryGradient,
} from "../../types/homepage";

function getCategoryIcon(category: string | null | undefined): string {
  if (!category) return "mdi:code-braces";
  const first = category.split("/")[0].toLowerCase();
  if (first === "trend") return "mdi:trending-up";
  if (first === "tools") return "mdi:wrench-outline";
  if (first === "infra") return "mdi:server-outline";
  if (first === "devops") return "mdi:pipe";
  return "mdi:code-braces";
}

interface FeaturedPostProps {
  post: PostNode | null;
}

export function FeaturedPost({ post }: FeaturedPostProps) {
  if (!post || !post.frontmatter || !post.frontmatter.slug) {
    return null;
  }

  const { slug, date, title, description, category, thumbnail } =
    post.frontmatter;

  const href = `/posts/${slug}/`;
  const gradient = getCategoryGradient(category);
  const catIcon = getCategoryIcon(category);

  return (
    <section className="w-full py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <span className="font-maple text-2xl text-foreground">주목할 포스트</span>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>

        <Link to={href} className="group block no-underline">
          <div
            className={cn(
              "flex flex-col md:flex-row rounded-lg overflow-hidden",
              "border border-border",
              "shadow-sm hover:shadow-md transition-shadow duration-200",
              "bg-card min-h-[220px]"
            )}
          >
            {/* Thumbnail / gradient left */}
            <div className="md:w-[42%] w-full relative min-h-[200px] md:min-h-0 shrink-0 overflow-hidden">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={title ?? "featured post thumbnail"}
                  className="w-full h-full object-cover absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full absolute inset-0 bg-gradient-to-br",
                    gradient,
                    "flex items-center justify-center"
                  )}
                >
                  <Icon
                    icon={catIcon}
                    width={52}
                    className="opacity-30 text-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Content right */}
            <div className="md:w-[58%] w-full p-7 md:p-9 flex flex-col justify-between">
              <div>
                {/* Featured chip */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 mb-4",
                    "px-2.5 py-1 rounded-full",
                    "text-[10px] font-sans font-semibold tracking-[0.15em] uppercase",
                    "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Latest Post
                </span>

                <h2
                  className={cn(
                    "font-maple text-2xl md:text-3xl leading-snug text-foreground",
                    "line-clamp-2",
                    "group-hover:text-primary transition-colors duration-200"
                  )}
                >
                  {title}
                </h2>

                {description && (
                  <p className="font-sans text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              {/* Bottom row */}
              <div className="flex flex-wrap items-center gap-3 mt-6">
                {date && (
                  <span className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
                    <Icon icon="mdi:calendar-outline" width={13} className="shrink-0" />
                    {date}
                  </span>
                )}
                {category && (
                  <span className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
                    <Icon
                      icon={catIcon}
                      width={13}
                      className="shrink-0"
                    />
                    {category}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-sm font-sans text-foreground font-medium group-hover:text-primary transition-colors duration-200">
                  포스트 읽기
                  <Icon
                    icon="mdi:arrow-right"
                    width={14}
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

export default FeaturedPost;
