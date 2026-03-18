import React from "react";
import { Link } from "gatsby";
import { Icon } from "@iconify/react";
import { Badge } from "@_components/ui/badge";
import { cn } from "../../lib/utils";
import { PostNode } from "../../types/homepage";
import { useCategoryConfig, CategoryConfig } from "../../hooks/useCategoryConfig";

// ─── Mini post item ────────────────────────────────────────────────────────────

function MiniPostItem({ post, hoverBg }: { post: PostNode; hoverBg: string }) {
  if (!post.frontmatter?.slug) return null;
  const { slug, title, date, category, thumbnail } = post.frontmatter;
  const href = `/posts/${slug}/`;

  return (
    <Link to={href} className="no-underline group">
      <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 cursor-pointer", hoverBg)}>
        <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden shadow-sm bg-muted">
          {thumbnail ? (
            <img src={thumbnail} alt={title ?? ""} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-gray-100" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors duration-150">
            {title}
          </p>
          {date && (
            <p className="font-sans text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Icon icon="mdi:calendar-outline" width={10} className="shrink-0" />
              {date}
            </p>
          )}
        </div>
        <Icon icon="mdi:arrow-right" width={14} className="shrink-0 text-muted-foreground/0 group-hover:text-primary/60 transition-all duration-150 -translate-x-1 group-hover:translate-x-0" />
      </div>
    </Link>
  );
}

// ─── CategoryCard ──────────────────────────────────────────────────────────────

function CategoryCard({ config, posts }: { config: CategoryConfig; posts: PostNode[] }) {
  const { theme } = config;

  return (
    <div className={cn("bg-white rounded-lg shadow-sm overflow-hidden", "border border-border/40", "flex flex-col", "hover:shadow-md transition-shadow duration-200")}>
      <div className={cn("h-1 w-full bg-gradient-to-r", theme.stripGradient)} />

      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", theme.iconBg)}>
            <Icon icon={config.icon} width={18} />
          </div>
          <div>
            <span className="font-maple text-lg leading-tight text-foreground block">{config.label}</span>
            <span className="font-sans text-xs text-muted-foreground">{config.labelEn}</span>
          </div>
        </div>
        <Badge className={cn("font-sans text-xs font-bold px-2.5 py-0.5 rounded-full border", theme.badge)} variant="outline">
          {posts.length}
        </Badge>
      </div>

      <div className="mx-5 h-px bg-border/50 mb-2" />

      <div className="px-2 flex-1">
        {posts.length > 0 ? (
          <div className="flex flex-col">
            {posts.map((post) => post.frontmatter?.slug && (
              <MiniPostItem key={post.frontmatter.slug} post={post} hoverBg={theme.hoverBg} />
            ))}
          </div>
        ) : (
          <p className="font-sans text-sm text-muted-foreground py-6 text-center">포스트가 없습니다.</p>
        )}
      </div>

      <div className="px-5 pb-5 pt-3 mt-auto">
        <Link
          to={config.href}
          className={cn("flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg", "border border-border/70 text-sm font-sans text-muted-foreground", "hover:bg-muted/50 hover:text-foreground hover:border-border", "transition-all duration-150 no-underline group")}
        >
          {config.label} 포스트 더 보기
          <Icon icon="mdi:arrow-right" width={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── CategoryShowcase ──────────────────────────────────────────────────────────

interface CategoryShowcaseProps {
  allPosts: ReadonlyArray<PostNode>;
}

export function CategoryShowcase({ allPosts }: CategoryShowcaseProps) {
  const categories = useCategoryConfig();

  const navCategories = categories.filter((c) => c.showInNav);

  // Filter posts per category (match frontmatter.category prefix case-insensitively)
  const postsByCategory = navCategories.map((cat) => ({
    config: cat,
    posts: allPosts
      .filter((node) => {
        const fc = node.frontmatter?.category?.toLowerCase() ?? "";
        const id = cat.categoryId.toLowerCase();
        return fc === id || fc.startsWith(id + "/");
      })
      .slice(0, 3) as PostNode[],
  }));

  return (
    <section
      className="w-full py-14 px-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(258 88% 62% / 0.06), transparent), hsl(var(--muted) / 0.3)",
      }}
    >
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="block w-6 h-1 rounded-full bg-primary" />
              <span className="block w-3 h-1 rounded-full bg-primary/40" />
            </div>
            <h2 className="font-maple text-2xl md:text-3xl text-foreground leading-tight">주제별 탐색</h2>
            <p className="font-sans text-sm text-muted-foreground mt-1">관심 있는 분야의 포스트를 찾아보세요</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {postsByCategory.map(({ config, posts }) => (
            <CategoryCard key={config.categoryId} config={config} posts={posts} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoryShowcase;
