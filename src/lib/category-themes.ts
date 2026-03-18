// ─── Category color themes ─────────────────────────────────────────────────────
// Add new themes here when you need a new color option.
// Reference a theme name in category.json's "colorTheme" field.

export type CategoryThemeName =
  | "indigo"
  | "amber"
  | "slate"
  | "green"
  | "teal"
  | "rose"
  | "violet"
  | "sky";

export type CategoryTheme = {
  /** Gradient top-strip for category cards */
  stripGradient: string;
  /** Icon bubble background + text color */
  iconBg: string;
  /** Badge classes (text, bg, border) */
  badge: string;
  /** Thumbnail placeholder gradient */
  gradient: string;
  /** Category dot color in post cards */
  dot: string;
  /** Category label text color */
  dotText: string;
  /** Hover bg for mini post items */
  hoverBg: string;
};

export const CATEGORY_THEMES: Record<CategoryThemeName, CategoryTheme> = {
  indigo: {
    stripGradient: "from-blue-500 via-indigo-500 to-violet-500",
    iconBg: "bg-indigo-50 text-indigo-600",
    badge: "text-indigo-700 bg-indigo-50 border-indigo-200",
    gradient: "from-blue-100 via-indigo-50 to-purple-100",
    dot: "bg-indigo-500",
    dotText: "text-indigo-600",
    hoverBg: "hover:bg-indigo-50/60",
  },
  amber: {
    stripGradient: "from-amber-400 via-orange-400 to-yellow-400",
    iconBg: "bg-amber-50 text-amber-500",
    badge: "text-amber-600 bg-amber-50 border-amber-200",
    gradient: "from-amber-100 via-orange-50 to-yellow-100",
    dot: "bg-amber-400",
    dotText: "text-amber-600",
    hoverBg: "hover:bg-amber-50/60",
  },
  slate: {
    stripGradient: "from-slate-400 via-gray-400 to-zinc-400",
    iconBg: "bg-slate-50 text-slate-500",
    badge: "text-slate-600 bg-slate-50 border-slate-200",
    gradient: "from-slate-100 via-gray-50 to-zinc-100",
    dot: "bg-slate-400",
    dotText: "text-slate-500",
    hoverBg: "hover:bg-slate-50/60",
  },
  green: {
    stripGradient: "from-green-500 via-emerald-500 to-lime-400",
    iconBg: "bg-green-50 text-green-600",
    badge: "text-green-700 bg-green-50 border-green-200",
    gradient: "from-green-100 via-emerald-50 to-lime-100",
    dot: "bg-green-500",
    dotText: "text-green-600",
    hoverBg: "hover:bg-green-50/60",
  },
  teal: {
    stripGradient: "from-teal-400 via-emerald-400 to-cyan-400",
    iconBg: "bg-teal-50 text-teal-500",
    badge: "text-teal-600 bg-teal-50 border-teal-200",
    gradient: "from-teal-100 via-emerald-50 to-cyan-100",
    dot: "bg-teal-400",
    dotText: "text-teal-600",
    hoverBg: "hover:bg-teal-50/60",
  },
  rose: {
    stripGradient: "from-rose-400 via-pink-400 to-fuchsia-400",
    iconBg: "bg-rose-50 text-rose-500",
    badge: "text-rose-600 bg-rose-50 border-rose-200",
    gradient: "from-rose-100 via-pink-50 to-fuchsia-100",
    dot: "bg-rose-400",
    dotText: "text-rose-600",
    hoverBg: "hover:bg-rose-50/60",
  },
  violet: {
    stripGradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    iconBg: "bg-violet-50 text-violet-600",
    badge: "text-violet-700 bg-violet-50 border-violet-200",
    gradient: "from-violet-100 via-purple-50 to-fuchsia-100",
    dot: "bg-violet-500",
    dotText: "text-violet-600",
    hoverBg: "hover:bg-violet-50/60",
  },
  sky: {
    stripGradient: "from-sky-400 via-blue-400 to-cyan-400",
    iconBg: "bg-sky-50 text-sky-500",
    badge: "text-sky-600 bg-sky-50 border-sky-200",
    gradient: "from-sky-100 via-blue-50 to-cyan-100",
    dot: "bg-sky-400",
    dotText: "text-sky-500",
    hoverBg: "hover:bg-sky-50/60",
  },
};

const FALLBACK_THEME: CategoryTheme = CATEGORY_THEMES.slate;

export function getTheme(colorTheme: string | null | undefined): CategoryTheme {
  if (!colorTheme) return FALLBACK_THEME;
  return CATEGORY_THEMES[colorTheme as CategoryThemeName] ?? FALLBACK_THEME;
}
