import React from "react";
import { Link } from "gatsby";
import _ from "lodash";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface TagsCloudProps {
  tags: string[];
}

// Pastel color variants that cycle based on tag index
const TAG_COLOR_VARIANTS = [
  "bg-rose-100/80 text-rose-700 border-rose-200 hover:bg-rose-200/80",
  "bg-sky-100/80 text-sky-700 border-sky-200 hover:bg-sky-200/80",
  "bg-violet-100/80 text-violet-700 border-violet-200 hover:bg-violet-200/80",
  "bg-amber-100/80 text-amber-700 border-amber-200 hover:bg-amber-200/80",
  "bg-emerald-100/80 text-emerald-700 border-emerald-200 hover:bg-emerald-200/80",
  "bg-fuchsia-100/80 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-200/80",
  "bg-teal-100/80 text-teal-700 border-teal-200 hover:bg-teal-200/80",
  "bg-orange-100/80 text-orange-700 border-orange-200 hover:bg-orange-200/80",
];

export function TagsCloud({ tags }: TagsCloudProps) {
  if (!tags || tags.length === 0) return null;

  const sortedTags = [...tags].sort();

  return (
    <section className="w-full py-10 px-4">
      {/* Subtle gradient background layer */}
      <div className="max-w-5xl mx-auto">
        <div
          className={cn(
            "rounded-lg px-6 py-8 md:px-10 md:py-10",
            "bg-gradient-to-br from-slate-50 via-white to-slate-50/60",
            "border border-slate-100 shadow-sm"
          )}
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-7">
            <span
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg",
                "bg-primary/10 text-primary"
              )}
            >
              <Icon icon="lucide:tag" width={18} height={18} />
            </span>
            <div className="flex items-baseline gap-3">
              <h2 className="m-0 font-maple text-2xl text-foreground">태그</h2>
              <span className="font-sans text-sm text-muted-foreground">
                {sortedTags.length}개
              </span>
            </div>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-2">
            {sortedTags.map((tag, index) => {
              const colorClass =
                TAG_COLOR_VARIANTS[index % TAG_COLOR_VARIANTS.length];

              return (
                <Link
                  key={tag}
                  to={`/tags/${_.kebabCase(tag)}/`}
                  className="no-underline"
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-sans text-sm font-medium",
                      "px-3.5 py-1.5 rounded-full border",
                      "transition-all duration-150 ease-out",
                      "hover:scale-105 cursor-pointer",
                      colorClass
                    )}
                  >
                    <span className="opacity-60 text-xs">#</span>
                    {tag}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TagsCloud;
