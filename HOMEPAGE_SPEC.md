# Homepage & Navigation Design Specification

**Project:** gomsemarie.github.io
**Stack:** Gatsby v5 · React v19 · TypeScript · TailwindCSS v3 · shadcn/ui
**Date:** 2026-03-18
**Audience:** Agent 2 (Homepage), Agent 3 (Navigation)

---

## 0. Shared Conventions

### CSS Variables (in `src/styles/globals.css`)
| Variable | Value |
|---|---|
| `--background` | `0 0% 100%` |
| `--foreground` | `222 47% 11%` |
| `--primary` | `221 83% 53%` |
| `--primary-foreground` | `210 40% 98%` |
| `--secondary` | `210 40% 96%` |
| `--muted` | `210 40% 96%` |
| `--muted-foreground` | `215 16% 47%` |
| `--border` | `214 32% 91%` |
| `--radius` | `0.625rem` |

### Tailwind Font Utilities
- `font-maple` → MapleStoryBold
- `font-maple-light` → MapleStoryLight
- `font-sans` → NanumGothic

### Path Aliases (tsconfig.json)
- `@_components` → `src/components`
- `@_hooks` → `src/hooks`
- `@_types` → `src/types`
- `@_layouts` → `src/layouts`
- `@_styles` → `src/styles`

### Shared Types File
`src/types/homepage.ts` — already created. Import from `@_types/homepage`.

Exports:
- `PostItem` — frontmatter shape
- `PostNode` — `{ frontmatter: PostItem | null }`
- `CategoryType` — `"tech" | "cocktail" | "other"`
- `getCategoryType(category)` — classifies a category string
- `getCategoryGradient(category)` — returns Tailwind gradient class string
- `getCategoryColors(category)` — returns `{ border, icon, badge }` Tailwind class strings

### Existing UI Primitives (`src/components/ui/`)
- `Button` — variants: `default` (bg-primary), `outline`, `ghost`, `link`; sizes: `default`, `sm`, `lg`, `icon`; supports `asChild` via Radix Slot
- `Badge` — variants: `default`, `secondary`, `outline`, `ghost`; rounded-full pill shape
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`
- `Separator`

### Existing Hooks (`src/hooks/query/`)
- `useGithubMyInfo()` — returns GitHub user object or `undefined` while loading. Shape: `{ avatar_url, name, login, bio, location, blog, html_url, public_repos, followers }`. Fetches via `GATSBY_GITHUB_USERNAME` env var.
- `usePostTags()` — static query, returns `{ allMdx: { group: Array<{ fieldValue }> } }`
- `usePostCategories()` — static query, same shape as above
- `usePostList()` — static query, returns all posts with full frontmatter

### Existing PostCard component (`src/components/post-card/index.tsx`)
Props interface `PostCardProps`:
```typescript
interface PostCardProps<T = string | null> {
  slug?: T;
  date?: T;
  title?: T;
  description?: T;
  tags?: T[] | null;
  category?: T;
  thumbnail?: T;
  userInfo?: any;
}
```
Uses `navigate()` internally, renders a Card with 200px thumbnail area + gradient fallback + tags/title/description/date/author footer. **Do not modify this component.** Use it as-is in the Recent Posts grid.

---

## 1. Navigation (Agent 3)

### Files to Modify / Create
- **Modify:** `src/layouts/global-layout/index.tsx` — replace the existing `Header` function entirely
- **Modify:** `src/layouts/global-layout/style.tsx` — the new nav is Tailwind-only; remove or keep `GlobalHeader` styled-component but it will no longer be used by the new Header
- **Create:** `src/components/site-header/index.tsx` — the new nav component

The `GlobalLayout` wrapper itself stays unchanged. Only the `Header()` function inside it is replaced by importing and rendering `<SiteHeader />`.

---

### 1.1 SiteHeader Component

**File:** `src/components/site-header/index.tsx`

```typescript
import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import { Github, Menu, X } from "lucide-react";
import { useGithubMyInfo } from "@_hooks/query/use-github-my-info";
import { cn } from "../../lib/utils";

export function SiteHeader() { ... }
export default SiteHeader;
```

#### Structure
```
<header>                          // sticky top-0 z-50, h-[60px]
  <div>                           // max-w-5xl mx-auto px-4, flex items-center h-full
    <!-- Left: Logo -->
    <Link to="/">
      <img />                     // avatar 28px rounded-full
      <span>gomsemarie</span>     // font-maple text-lg
    </Link>

    <!-- Center: Desktop Nav -->
    <nav aria-label="주 메뉴">   // hidden md:flex, gap-1
      <NavLink to="/">홈</NavLink>
      <NavLink to="/categories/gatsby/">개발</NavLink>
      <NavLink to="/categories/cocktail/">칵테일</NavLink>
      <NavLink to="/tags/">태그</NavLink>
    </nav>

    <!-- Right: GitHub + Hamburger -->
    <div>
      <a href="https://github.com/gomsemarie">  // GitHub icon link
        <Github size={20} />
      </a>
      <button>                    // md:hidden, hamburger toggle
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div>
  </div>

  <!-- Mobile Dropdown -->
  {isOpen && (
    <div>                         // md:hidden, border-t border-border, bg-background
      <nav aria-label="모바일 메뉴">
        <MobileNavLink>홈</MobileNavLink>
        ...
      </nav>
    </div>
  )}
</header>
```

#### Tailwind Classes — Header `<header>` element
```
sticky top-0 z-50 w-full h-[60px]
bg-background/95 backdrop-blur-sm
transition-shadow duration-200
```
Add border-b via JS scroll state:
- Scrolled (scrollY > 10): `border-b border-border shadow-sm`
- Not scrolled: no border, no shadow

#### Logo
```
flex items-center gap-2 no-underline
```
- Avatar `<img>`: `w-7 h-7 rounded-full object-cover ring-1 ring-border`
- Text `<span>`: `font-maple text-lg text-foreground`
- Avatar src: `githubData?.avatar_url` (from `useGithubMyInfo()`); if undefined, render text-only logo (no broken img)

#### Desktop NavLink inner component
```typescript
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  // Use Gatsby's useLocation or compare location.pathname
}
```
Classes (base): `relative px-3 py-1.5 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent no-underline`

Active state (pathname starts with or equals `to`):
- `text-primary font-semibold`
- After pseudo-element indicator: implement as an absolutely positioned `<span>` inside the link:
  `absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary`

Special case: `"/"` route is active only when `pathname === "/"` exactly (not prefix match).

#### Mobile Hamburger Button
```
md:hidden p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground
```
Accessibility:
- `aria-expanded={isOpen}`
- `aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}`
- `aria-controls="mobile-nav"`

#### Mobile Dropdown
```
md:hidden w-full bg-background border-t border-border
```
`<nav id="mobile-nav" aria-label="모바일 메뉴">` wraps links as a vertical flex column.

MobileNavLink classes (base): `block px-4 py-3 text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-underline border-b border-border/50 last:border-b-0`

Active: `text-primary font-semibold bg-primary/5`

Close menu on link click (call `setIsOpen(false)` in `onClick`).

#### Scroll effect implementation
```typescript
useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > 10);
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

#### Active route detection
Use Gatsby `useLocation` from `@reach/router` (re-exported from `gatsby`):
```typescript
import { Link, useLocation } from "@reach/router";
// or: import { useLocation } from "@reach/router";
// Gatsby re-exports: import { navigate } from "gatsby"
```
Actually use `window.location.pathname` inside a `useEffect` or rely on Gatsby's `Link` component which automatically adds `aria-current="page"`. For the custom active styling, read `location.pathname` via the Gatsby `Location` component or a local state approach. The simplest pattern:

```typescript
// At top of SiteHeader:
const [pathname, setPathname] = React.useState("");
React.useEffect(() => {
  setPathname(window.location.pathname);
}, []);
```

Then: `const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);`

---

## 2. Homepage (Agent 2)

### Files to Create
1. `src/components/split-hero/index.tsx`
2. `src/components/featured-post/index.tsx`
3. `src/components/category-showcase/index.tsx`
4. `src/components/tags-cloud/index.tsx`

### Files to Modify
1. `src/pages/index.tsx` — update GraphQL query + compose all sections
2. `src/components/recent-posts/index.tsx` — minor: already correct, no change needed (section title and grid are correct)
3. `src/components/hero-section/index.tsx` — **replace entirely** with the new Split Hero design (or keep as alias)

The recommended approach: replace `src/components/hero-section/index.tsx` with a re-export of `SplitHero`, and create the actual component in `src/components/split-hero/index.tsx`. This avoids breaking any other imports of `HeroSection`.

---

### 2.1 Updated `src/pages/index.tsx`

The page needs a larger GraphQL query to support all sections:

```typescript
export const query = graphql`
  {
    allMdx(sort: { frontmatter: { date: DESC } }) {
      nodes {
        frontmatter {
          slug
          date(formatString: "MMMM DD, YYYY")
          title
          description
          tags
          category
          thumbnail
        }
      }
      group(field: { frontmatter: { tags: SELECT } }) {
        fieldValue
      }
    }
  }
`;
```

Page component structure:
```tsx
const IndexRoute = ({ data }: PageProps<DataProps>) => {
  const allNodes = data.allMdx.nodes;
  const tags = data.allMdx.group.map(g => g.fieldValue).filter(Boolean) as string[];

  const techPosts = allNodes.filter(n =>
    getCategoryType(n.frontmatter?.category) === "tech"
  );
  const cocktailPosts = allNodes.filter(n =>
    getCategoryType(n.frontmatter?.category) === "cocktail"
  );
  const featuredPost = allNodes[0] ?? null;
  const recentPosts = allNodes.slice(0, 6);

  return (
    <main>
      <SplitHero />
      <FeaturedPost post={featuredPost} />
      <CategoryShowcase techPosts={techPosts} cocktailPosts={cocktailPosts} />
      <TagsCloud tags={tags} />
      <RecentPosts posts={recentPosts} />
    </main>
  );
};
```

Import `getCategoryType` from `@_types/homepage`.

---

### 2.2 SplitHero (`src/components/split-hero/index.tsx`)

**Purpose:** Replaces the current centered HeroSection with an asymmetric 2-column layout.

**Props:** None (fetches data internally via `useGithubMyInfo()`).

**Layout:**
```
<section min-h-[420px] md:min-h-[50vh] w-full flex flex-col md:flex-row>
  <!-- Left panel 45% -->
  <div class="w-full md:w-[45%] bg-slate-50 flex flex-col items-center justify-center gap-5 py-12 px-8">
    ...
  </div>
  <!-- Right panel 55% -->
  <div class="w-full md:w-[55%] bg-background flex flex-col justify-center px-10 py-12 gap-4">
    ...
  </div>
</section>
```

#### Left Panel Content (in order)
1. **Avatar**
   - `<img>` 160×160px
   - Classes: `w-40 h-40 rounded-2xl object-cover border-2 border-primary/20 shadow-xl`
   - src: `githubData?.avatar_url`
   - Fallback skeleton: `w-40 h-40 rounded-2xl bg-slate-200 animate-pulse`

2. **GitHub handle**
   - `<p>` text: `@{githubData?.login ?? "gomsemarie"}`
   - Classes: `font-sans text-sm text-muted-foreground mt-1`

3. **Stat pills** (flex row, gap-2)
   Each pill: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border text-xs font-sans text-muted-foreground shadow-sm`
   - Pill 1: BookOpen icon (size 12) + `{public_repos} repos`
   - Pill 2: Users icon (size 12) + `{followers} followers`
   - Loading: two `w-20 h-6 rounded-full bg-slate-200 animate-pulse` divs

#### Right Panel Content (in order)
1. **Role chip** (Badge component)
   ```tsx
   <Badge variant="outline" className="w-fit text-xs font-sans text-primary border-primary/30 bg-primary/5">
     Frontend Engineer
   </Badge>
   ```

2. **Name heading**
   ```tsx
   <h1 className="font-maple text-5xl md:text-6xl text-foreground leading-tight">
     {githubData?.name ?? "gomsemarie"}
   </h1>
   ```
   Loading: `w-48 h-12 rounded bg-slate-200 animate-pulse`

3. **Bio**
   ```tsx
   <p className="font-sans text-base text-muted-foreground leading-relaxed max-w-sm">
     {githubData?.bio}
   </p>
   ```
   Only render if `githubData?.bio` is truthy.

4. **Meta row** (flex wrap, gap-x-4 gap-y-1.5)
   ```tsx
   // Location
   <span className="flex items-center gap-1.5 text-sm font-sans text-muted-foreground">
     <MapPin size={13} className="shrink-0" />
     {githubData.location}
   </span>
   // Blog link
   <a href={...} className="flex items-center gap-1.5 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors no-underline">
     <LinkIcon size={13} className="shrink-0" />
     {githubData.blog}
   </a>
   ```
   Only render each item if the value is truthy.

5. **CTA Buttons** (flex row, gap-3, mt-2)
   ```tsx
   <Button variant="default" size="default" asChild>
     <a href={githubData.html_url} target="_blank" rel="noopener noreferrer">
       <Github size={16} /> GitHub
     </a>
   </Button>
   <Button variant="outline" size="default" asChild>
     <a href={blogUrl} target="_blank" rel="noopener noreferrer">
       <LinkIcon size={16} /> 블로그
     </a>
   </Button>
   ```

**Mobile behavior:** On `< md` breakpoint, panels stack vertically. Left panel uses `py-10 px-6`, right panel uses `px-6 py-8`. Avatar size stays 160px. Name font-size falls back to `text-4xl`. Add `items-center text-center` to right panel on mobile using responsive utilities.

**Loading state:** Show skeleton for avatar, handle, pills, name, bio (right panel shows role chip + two skeleton lines). Buttons do not appear until data loads.

**Divider at bottom:** After the section, render the same subtle divider as the current HeroSection:
```tsx
<div className="max-w-5xl mx-auto px-4">
  <div className="relative flex items-center">
    <div className="flex-1 h-px bg-border" />
    <div className="mx-4 w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
    <div className="flex-1 h-px bg-border" />
  </div>
</div>
```

---

### 2.3 FeaturedPost (`src/components/featured-post/index.tsx`)

**Props:**
```typescript
interface FeaturedPostProps {
  post: PostNode | null;
}
```
Import `PostNode` from `@_types/homepage`.

**Returns null** if `post` is null or `post.frontmatter` is null.

**Outer section:**
```tsx
<section className="w-full py-10 px-4">
  <div className="max-w-5xl mx-auto">
    ...
  </div>
</section>
```

**Card:** A Gatsby `<Link>` wrapping an inner div styled as a card:
```tsx
<Link to={`/posts/${slug}/`} className="group block no-underline">
  <div className={cn(
    "overflow-hidden rounded-xl border border-border",
    "flex flex-col md:flex-row",
    "transition-shadow duration-200 hover:shadow-lg",
    "bg-card"
  )}>
    <!-- Left 45%: Visual panel -->
    <div className="w-full md:w-[45%] min-h-[200px] md:min-h-[240px] relative overflow-hidden">
      {thumbnail ? (
        <img src={thumbnail} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", getCategoryGradient(category))}>
          {/* category icon — Code2 for tech, GlassWater for cocktail */}
          {CategoryIcon && <CategoryIcon className={cn("w-16 h-16 opacity-40", getCategoryColors(category).icon)} />}
        </div>
      )}
    </div>

    <!-- Right 55%: Content panel -->
    <div className="w-full md:w-[55%] flex flex-col justify-between p-6 md:p-8">
      <div className="flex flex-col gap-3">
        <!-- "Latest Post" label -->
        <span className="text-xs font-sans text-muted-foreground uppercase tracking-widest">
          Latest Post
        </span>
        <!-- Category badge -->
        {category && (
          <Badge variant="secondary" className={cn("w-fit font-sans text-xs", getCategoryColors(category).badge)}>
            {category}
          </Badge>
        )}
        <!-- Title -->
        <h2 className="font-maple text-2xl text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h2>
        <!-- Description -->
        {description && (
          <p className="font-sans text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {description}
          </p>
        )}
      </div>
      <!-- Footer row -->
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        {date && (
          <span className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
            <Calendar size={12} />
            {date}
          </span>
        )}
        <span className="text-sm font-sans text-primary ml-auto flex items-center gap-1 group-hover:gap-2 transition-all">
          포스트 읽기 →
        </span>
      </div>
    </div>
  </div>
</Link>
```

Import `getCategoryGradient`, `getCategoryColors` from `@_types/homepage`. Import `Code2`, `GlassWater` from `lucide-react` for the gradient panel icons.

CategoryIcon selection logic:
```typescript
import { getCategoryType } from "@_types/homepage";
const catType = getCategoryType(category);
const CategoryIcon = catType === "tech" ? Code2 : catType === "cocktail" ? GlassWater : null;
```

---

### 2.4 CategoryShowcase (`src/components/category-showcase/index.tsx`)

**Props:**
```typescript
interface CategoryShowcaseProps {
  techPosts: ReadonlyArray<PostNode>;
  cocktailPosts: ReadonlyArray<PostNode>;
}
```
Import `PostNode` from `@_types/homepage`.

**Outer section:**
```tsx
<section className="w-full py-12 px-4">
  <div className="max-w-5xl mx-auto">
    <!-- Section header -->
    <h2 className="font-maple text-2xl text-foreground mb-8 inline-block relative">
      주제별 탐색
      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-transparent" />
    </h2>

    <!-- Two-column grid -->
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CategoryColumn ... />  {/* Tech */}
      <CategoryColumn ... />  {/* Cocktail */}
    </div>
  </div>
</section>
```

**CategoryColumn inner component (not exported):**
```typescript
interface CategoryColumnProps {
  title: string;               // "개발" or "칵테일"
  icon: React.ReactNode;       // <Code2 /> or <GlassWater />
  posts: ReadonlyArray<PostNode>;
  totalCount: number;
  moreLink: string;            // "/categories/gatsby/" or "/categories/cocktail/"
  borderColor: string;         // Tailwind class from getCategoryColors().border
}
```

Column structure:
```tsx
<div className={cn("border-l-4 pl-4", borderColor)}>
  <!-- Column header -->
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon}  {/* size-5 with category icon color */}
      <h3 className="font-maple text-lg text-foreground">{title}</h3>
      <span className="font-sans text-xs text-muted-foreground">({totalCount})</span>
    </div>
    <Link to={moreLink} className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors no-underline flex items-center gap-1 group">
      더 보기
      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  </div>

  <!-- Mini post list: 3 posts -->
  <div className="flex flex-col gap-2">
    {posts.slice(0, 3).map(post => <MiniPostCard key={post.frontmatter?.slug} post={post} />)}
  </div>
</div>
```

**MiniPostCard inner component (not exported):**
```typescript
interface MiniPostCardProps {
  post: PostNode;
}
```
Structure — horizontal compact row:
```tsx
<Link to={`/posts/${slug}/`} className="group flex items-start gap-3 no-underline py-2 rounded-md hover:bg-accent px-2 -mx-2 transition-colors">
  <!-- Small gradient thumbnail 48×48 -->
  <div className={cn(
    "w-12 h-12 rounded-md shrink-0 bg-gradient-to-br flex items-center justify-center overflow-hidden",
    getCategoryGradient(category)
  )}>
    {thumbnail
      ? <img src={thumbnail} alt="" className="w-full h-full object-cover" />
      : <CategorySmallIcon className={cn("w-5 h-5 opacity-50", getCategoryColors(category).icon)} />
    }
  </div>
  <!-- Text -->
  <div className="flex flex-col gap-0.5 min-w-0">
    <p className="font-sans text-sm text-foreground font-semibold line-clamp-1 group-hover:text-primary transition-colors m-0 leading-snug">
      {title}
    </p>
    {date && (
      <span className="text-xs font-sans text-muted-foreground">{date}</span>
    )}
  </div>
</Link>
```

---

### 2.5 TagsCloud (`src/components/tags-cloud/index.tsx`)

**Props:**
```typescript
interface TagsCloudProps {
  tags: string[];
}
```

**Outer section:**
```tsx
<section className="w-full py-10 px-4 bg-slate-50/50">
  <div className="max-w-5xl mx-auto">
    <h2 className="font-maple text-2xl text-foreground mb-6 inline-block relative">
      태그
      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-transparent" />
    </h2>
    <div className="flex flex-wrap gap-2">
      {tags.sort().map(tag => (
        <Link
          key={tag}
          to={`/tags/${tag}/`}
          className="no-underline"
        >
          <Badge
            variant="outline"
            className="font-sans text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          >
            {tag}
          </Badge>
        </Link>
      ))}
    </div>
    {tags.length === 0 && (
      <p className="font-sans text-sm text-muted-foreground">태그가 없습니다.</p>
    )}
  </div>
</section>
```

---

### 2.6 RecentPosts (existing — no change needed)

The existing `src/components/recent-posts/index.tsx` is already correct:
- Section title "최근 포스트" with gradient underline
- `lg:grid-cols-3 sm:grid-cols-2 grid-cols-1` responsive grid
- Uses its own internal `PostCard` (not the same as `src/components/post-card/index.tsx`)
- "모든 포스트 보기" link to `/posts/`

**Pass only `posts.slice(0, 6)` to this component.** The component internally slices to 6 anyway but pass the pre-sliced array for clarity.

---

## 3. Data Flow Summary

```
src/pages/index.tsx (GraphQL page query)
  ↓ allMdx.nodes (all posts, date DESC)
  ↓ allMdx.group  (tags)

  → allNodes[0]                    → <FeaturedPost post={...} />
  → allNodes filtered by tech      → <CategoryShowcase techPosts={...} />
  → allNodes filtered by cocktail  → <CategoryShowcase cocktailPosts={...} />
  → allMdx.group mapped            → <TagsCloud tags={...} />
  → allNodes.slice(0, 6)           → <RecentPosts posts={...} />

  useGithubMyInfo() (client-side fetch)  →  <SplitHero /> (internal)
  useGithubMyInfo() (client-side fetch)  →  <SiteHeader /> (logo avatar)
```

---

## 4. Key Implementation Notes

### For Agent 2 (Homepage)

1. **Do not use `useStaticQuery`** inside page components. The page-level GraphQL query (`export const query`) already provides all data. Pass it as props.

2. **`getCategoryType` logic** in `src/types/homepage.ts` uses `toLowerCase().includes()` which is more robust than the existing `startsWith()` in `recent-posts/index.tsx`. Use the shared util everywhere.

3. **No new shadcn components** are needed. All styling uses only the four existing primitives (Button, Badge, Card, Separator) plus Tailwind utilities.

4. **The existing `PostCard` in `src/components/post-card/index.tsx`** uses `navigate()` internally and renders the author avatar. The `RecentPosts` component uses its own internal `PostCard`. Do not mix the two.

5. **Animation:** The current codebase uses `animate-fade-in` and `animate-fade-up` CSS animation classes (defined in Tailwind config / globals). Use `animate-fade-in` on the SplitHero section's main container.

6. **Category filtering** for `CategoryShowcase`: filter from the full `allNodes` array in `index.tsx` using `getCategoryType`. Pass the filtered arrays as props — do not fetch separately.

7. **Tags are already lowercase** in the MDX frontmatter. No transformation needed beyond `.sort()` for alphabetical display.

### For Agent 3 (Navigation)

1. **The existing `GlobalLayout`** in `src/layouts/global-layout/index.tsx` uses a styled-components `GlobalHeader`. Replace only the `Header()` function; do not touch `Footer()`, `GlobalStyle`, or the `LayoutDiv` wrapper.

2. **The faBurger icon** (FontAwesome) and `Modal` + `PostNavigator` pattern in the old Header can be fully removed. The new `SiteHeader` manages its own mobile menu state.

3. **Import `SiteHeader`** into `global-layout/index.tsx` as:
   ```typescript
   import { SiteHeader } from "@_components/site-header";
   ```
   Then in `GlobalLayout`:
   ```tsx
   <LayoutDiv data-layout="default-layout">
     <SiteHeader />
     <div className="contents-area">{children}</div>
     <Footer />
   </LayoutDiv>
   ```

4. **`useLocation` from Gatsby:** Gatsby v5 re-exports `@reach/router` APIs. Use:
   ```typescript
   import { useLocation } from "@reach/router";
   ```
   This is available in Gatsby v5 via `@gatsbyjs/reach-router` (bundled). If that import fails, fall back to `window.location.pathname` inside a `useEffect`.

5. **The nav `h-[60px]` height** is important — it should match any `scroll-padding-top` or anchor offset logic in post pages. Do not change the height without checking.

6. **Do not add Tailwind `dark:` variants** — there is no dark mode configured in this project's CSS variables or Tailwind config.

---

## 5. File List Reference

### Files to Create
| Path | Owner |
|---|---|
| `src/types/homepage.ts` | Already created |
| `src/components/site-header/index.tsx` | Agent 3 |
| `src/components/split-hero/index.tsx` | Agent 2 |
| `src/components/featured-post/index.tsx` | Agent 2 |
| `src/components/category-showcase/index.tsx` | Agent 2 |
| `src/components/tags-cloud/index.tsx` | Agent 2 |

### Files to Modify
| Path | Owner | Change |
|---|---|---|
| `src/pages/index.tsx` | Agent 2 | Expand query + compose new sections |
| `src/components/hero-section/index.tsx` | Agent 2 | Replace with re-export of SplitHero |
| `src/layouts/global-layout/index.tsx` | Agent 3 | Swap Header() for SiteHeader import |
