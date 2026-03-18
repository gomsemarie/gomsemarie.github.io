// Shared types for homepage components

export type PostItem = {
  slug: string | null;
  date: string | null;
  title: string | null;
  description: string | null;
  tags: ReadonlyArray<string | null> | null;
  category: string | null;
  thumbnail: string | null;
};

export type PostNode = {
  frontmatter: PostItem | null;
};

// ─── Category helpers (used by post-card, recent-posts, etc.) ─────────────────
// These helpers derive display info from frontmatter category strings.
// When adding a new category, add its colorTheme in category.json — not here.
// Only update getCategoryGradient/getCategoryColors if you need a new visual rule.

export function getCategoryGradient(category: string | null | undefined): string {
  if (!category) return "from-slate-100 to-gray-100";
  const first = category.split("/")[0].toLowerCase();
  if (first === "trend") return "from-amber-100 via-orange-50 to-yellow-100";
  if (first === "tools") return "from-teal-100 via-emerald-50 to-cyan-100";
  if (first === "infra") return "from-slate-100 via-gray-50 to-zinc-100";
  if (first === "devops") return "from-green-100 via-emerald-50 to-lime-100";
  // tech / frontend / gatsby / react / next / etc.
  return "from-blue-100 via-indigo-50 to-purple-100";
}

export function getCategoryDotColor(category: string | null | undefined): {
  dot: string;
  text: string;
} {
  if (!category) return { dot: "bg-slate-300", text: "text-slate-500" };
  const first = category.split("/")[0].toLowerCase();
  if (first === "trend") return { dot: "bg-amber-400", text: "text-amber-600" };
  if (first === "tools") return { dot: "bg-teal-400", text: "text-teal-600" };
  if (first === "infra") return { dot: "bg-slate-400", text: "text-slate-500" };
  if (first === "devops") return { dot: "bg-green-500", text: "text-green-600" };
  return { dot: "bg-indigo-500", text: "text-indigo-600" };
}
