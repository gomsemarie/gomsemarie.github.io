import React, { useId } from "react";
import { navigate } from "gatsby";
import _ from "lodash";
import { Icon } from "@iconify/react";
import { useGithubMyInfo } from "@_hooks";
import { Card, CardContent } from "@_components/ui/card";
import { Badge } from "@_components/ui/badge";
import { cn } from "../../lib/utils";

export interface PostCardProps<T = string | null> {
  slug?: T;
  date?: T;
  title?: T;
  description?: T;
  tags?: T[] | null;
  category?: T;
  thumbnail?: T;
  userInfo?: any;
}

type GradientConfig = {
  gradient: string;
  icon: React.ReactNode;
};

function getCategoryGradient(category: string): GradientConfig {
  if (category.toLowerCase().includes("trend")) {
    return {
      gradient: "bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100",
      icon: <Icon icon="mdi:trending-up" className="w-10 h-10 text-amber-300" />,
    };
  }
  if (category.toLowerCase().includes("tools")) {
    return {
      gradient: "bg-gradient-to-br from-teal-100 via-emerald-50 to-cyan-100",
      icon: <Icon icon="mdi:wrench-outline" className="w-10 h-10 text-teal-300" />,
    };
  }
  if (
    category.startsWith("Gatsby") ||
    category.toLowerCase().includes("tech")
  ) {
    return {
      gradient: "bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100",
      icon: <Icon icon="lucide:code-2" className="w-10 h-10 text-indigo-300" />,
    };
  }
  return {
    gradient: "bg-gradient-to-br from-slate-100 to-gray-100",
    icon: <Icon icon="lucide:file-text" className="w-10 h-10 text-slate-300" />,
  };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card flex flex-col">
      {/* Thumbnail skeleton */}
      <div className="relative h-[200px] overflow-hidden shrink-0">
        <div
          className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton"
        />
      </div>
      {/* Content skeleton */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Tags */}
        <div className="flex gap-1.5">
          <div className="h-5 w-12 rounded-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" />
          <div className="h-5 w-16 rounded-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.1s" }} />
        </div>
        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.2s" }} />
          <div className="h-4 w-3/4 rounded bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.25s" }} />
        </div>
        {/* Description */}
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-full rounded bg-gradient-to-r from-muted via-muted-foreground/8 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.3s" }} />
          <div className="h-3.5 w-5/6 rounded bg-gradient-to-r from-muted via-muted-foreground/8 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.35s" }} />
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between pt-1 mt-auto border-t border-border/50">
          <div className="h-3 w-20 rounded bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.4s" }} />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.45s" }} />
            <div className="h-3 w-14 rounded bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-skeleton" style={{ animationDelay: "0.5s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────

export default function PostCard(props: PostCardProps) {
  const id = useId();
  const myInfo = useGithubMyInfo();

  const slug = _.isNil(props.slug) ? "" : props.slug;
  const date = _.isNil(props.date) ? "" : props.date;
  const title = _.isNil(props.title) ? "" : props.title;
  const description = _.isNil(props.description) ? "" : props.description;
  const tags = _.isNil(props.tags) ? [] : props.tags;
  const category = _.isNil(props.category) ? "" : props.category;
  const thumbnail = _.isNil(props.thumbnail) ? "" : props.thumbnail;

  const hasThumbnail = !_.isEmpty(thumbnail);
  const { gradient, icon } = getCategoryGradient(category);

  const handleOnClick = () => {
    navigate(`/${process.env.GATSBY_POSTS_PATH}/${_.kebabCase(slug)}/`);
  };

  return (
    <Card
      onClick={handleOnClick}
      className={cn(
        "group overflow-hidden cursor-pointer",
        "transition-all duration-300 ease-in-out",
        "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5",
        "hover:border-primary/20",
        "animate-fade-up",
        "flex flex-col"
      )}
    >
      {/* Thumbnail area */}
      <div className="relative h-[200px] overflow-hidden shrink-0">
        {hasThumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center",
              "transition-all duration-500",
              "group-hover:brightness-105 group-hover:saturate-110",
              gradient
            )}
          >
            <span className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              {icon}
            </span>
          </div>
        )}
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content area */}
      <CardContent className="flex flex-col gap-3 p-4 flex-1">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <Badge
                key={`${id}-tag-${index}`}
                variant="ghost"
                className="text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <p
          className={cn(
            "font-sans font-semibold text-base text-foreground",
            "leading-snug m-0",
            "overflow-hidden",
            "group-hover:text-primary transition-colors duration-200",
            "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]"
          )}
        >
          {title}
        </p>

        {/* Description */}
        <p
          className={cn(
            "font-sans text-sm text-muted-foreground",
            "leading-relaxed m-0 flex-1",
            "overflow-hidden",
            "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]"
          )}
        >
          {description}
        </p>

        {/* Footer: date + author */}
        <div className="flex items-center justify-between pt-1 mt-auto border-t border-border/50">
          {/* Date */}
          {!_.isEmpty(date) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon icon="lucide:calendar" className="w-3.5 h-3.5 shrink-0" />
              <span className="font-sans">{date}</span>
            </div>
          )}

          {/* Author */}
          {myInfo !== undefined && (
            <div className="flex items-center gap-2 ml-auto">
              <img
                src={myInfo.avatar_url}
                alt={myInfo.login}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-sans text-xs text-muted-foreground">
                {myInfo.login}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
