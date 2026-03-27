import React, { useState, useMemo } from "react";
import { PostCard } from "@_components";
import _ from "lodash";
import { Icon } from "@iconify/react";
import { PostCardProps } from "@_components/post-card";
import { cn } from "../../lib/utils";

interface PostListTemplateProps {
  title: string | null;
  list: PostCardProps[];
  totalCount: number;
}

export default function PostListTemplate({
  title,
  list,
  totalCount,
}: PostListTemplateProps) {
  // Extract unique categories from posts
  const categories = useMemo(() => {
    const cats = new Set<string>();
    list.forEach((post) => {
      if (post.category) cats.add(post.category);
    });
    return Array.from(cats).sort();
  }, [list]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    if (!activeCategory) return list;
    return list.filter((post) => post.category === activeCategory);
  }, [list, activeCategory]);

  return (
    <div className="w-full" data-page="tag-page">
      {/* Hero header section */}
      <section className="w-full bg-gradient-to-b from-muted/50 to-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          {/* Tag label */}
          <p className="m-0 mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-primary/60">
            Posts
          </p>

          {/* Title */}
          <h1
            className={cn(
              "m-0 mb-4 font-maple text-4xl md:text-5xl lg:text-6xl",
              "text-foreground leading-tight break-words"
            )}
          >
            {title}
          </h1>

          {/* Decorative gradient underline */}
          <div className="w-16 h-1 rounded-full bg-gradient-to-r from-primary to-primary/30 mb-6" />

          {/* Post count badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-sans text-sm",
              "px-3 py-1 rounded-full",
              "bg-primary/5 text-primary/80 border border-primary/20"
            )}
          >
            <span className="font-medium">{activeCategory ? filteredList.length : totalCount}</span>
            <span className="text-primary/60">개의 게시물</span>
          </span>
        </div>
      </section>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <section className="px-6 pt-8 md:pt-10">
          <div className="mx-auto max-w-screen-xl">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-sans font-medium",
                  "border transition-all duration-300 ease-out",
                  "hover:scale-[1.03] active:scale-[0.97]",
                  !activeCategory
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                )}
              >
                <Icon icon="lucide:layout-grid" width={14} />
                전체
              </button>
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                const count = list.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(isActive ? null : cat)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-sans font-medium",
                      "border transition-all duration-300 ease-out",
                      "hover:scale-[1.03] active:scale-[0.97]",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                        : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                    )}
                  >
                    {cat}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-medium",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Post grid section */}
      <section className="px-6 py-8 md:py-12">
        <div
          className={cn(
            "mx-auto max-w-screen-xl",
            "grid gap-6 md:gap-7",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {filteredList.map((props, index) => (
            <div
              key={`post-card-${index}`}
              style={{ animationDelay: `${index * 60}ms` }}
              className="animate-fade-up opacity-0"
            >
              <PostCard {...props} />
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Icon icon="lucide:inbox" width={48} className="text-muted-foreground/30 mb-4" />
            <p className="font-sans text-muted-foreground">해당 카테고리의 게시물이 없습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
