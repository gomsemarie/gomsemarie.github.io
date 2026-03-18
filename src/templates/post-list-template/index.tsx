import React from "react";
import { PostCard } from "@_components";
import _ from "lodash";
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
  return (
    <div className="w-full" data-page="tag-page">
      {/* Hero header section */}
      <section className="w-full bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
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
            <span className="font-medium">{totalCount}</span>
            <span className="text-primary/60">개의 게시물</span>
          </span>
        </div>
      </section>

      {/* Post grid section */}
      <section className="px-6 py-10 md:py-14">
        <div
          className={cn(
            "mx-auto max-w-screen-xl",
            "grid gap-5",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {list.map((props, index) => (
            <PostCard key={`post-card-${index}`} {...props} />
          ))}
        </div>
      </section>
    </div>
  );
}
