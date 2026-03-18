import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@_components/ui/button";
import { useGithubMyInfo } from "@_hooks";
import { cn } from "../../lib/utils";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center px-4 gap-5 animate-pulse">
      <div className="w-28 h-28 rounded-full bg-slate-200" />
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-12 w-56 rounded-lg bg-slate-100" />
      <div className="h-4 w-64 rounded bg-slate-100" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="h-px w-48 bg-slate-100 my-1" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-md bg-slate-100" />
        <div className="h-6 w-20 rounded-md bg-slate-100" />
        <div className="h-6 w-16 rounded-md bg-slate-100" />
        <div className="h-6 w-24 rounded-md bg-slate-100" />
      </div>
      <div className="flex gap-3 mt-2">
        <div className="h-10 w-36 rounded-md bg-slate-100" />
        <div className="h-10 w-24 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

// ─── SplitHero ───────────────────────────────────────────────────────────────

export function SplitHero() {
  const githubData = useGithubMyInfo();
  const isLoading = githubData === undefined;

  if (isLoading) {
    return <section className="w-full border-b border-border"><HeroSkeleton /></section>;
  }

  const blogHref = githubData?.blog
    ? githubData.blog.startsWith("http")
      ? githubData.blog
      : `https://${githubData.blog}`
    : null;

  const TECH_STACK = [
    { label: "React",        icon: <Icon icon="logos:react" width={13} />,           color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "TypeScript",   icon: <Icon icon="logos:typescript-icon" width={13} />,  color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { label: "Gatsby",       icon: <Icon icon="logos:gatsby" width={13} />,           color: "text-purple-600 bg-purple-50 border-purple-200" },
    { label: "칵테일 레시피", icon: <span className="text-[13px] leading-none">🍸</span>, color: "text-rose-600 bg-rose-50 border-rose-200" },
  ];

  return (
    <section className="w-full border-b border-border">
      {/* Subtle dot pattern background */}
      <div
        className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        {/* Fade overlay so dots are subtle */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background pointer-events-none" />

        {/* Centered content */}
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center px-6 py-12 gap-0">

          {/* Avatar */}
          <div className="relative mb-5">
            <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200" />
            <img
              src={githubData?.avatar_url}
              alt={`${githubData?.name ?? "GitHub"} avatar`}
              width={112}
              height={112}
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-2 ring-background"
            />
          </div>

          {/* Handle */}
          {githubData?.login && (
            <p className="font-sans text-sm text-muted-foreground mb-2">
              @{githubData.login}
            </p>
          )}

          {/* Role chip */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-sans text-muted-foreground mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Frontend Engineer
          </span>

          {/* Name */}
          <h1 className="font-maple text-4xl md:text-5xl leading-tight text-foreground tracking-tight mb-3">
            {githubData?.name ?? ""}
          </h1>

          {/* Tagline */}
          <p className="font-maple-light text-base text-muted-foreground mb-4 tracking-wide">
            코드로 빚는 개발, 손으로 빚는 칵테일
          </p>

          {/* Bio */}
          {githubData?.bio && (
            <p className="font-sans text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
              {githubData.bio}
            </p>
          )}

          {/* Divider */}
          <div className="w-16 h-px bg-border mb-6" />

          {/* Tech stack */}
          <div className="mb-2">
            <p className="text-[10px] font-sans text-muted-foreground/50 uppercase tracking-[0.15em] mb-3">
              주로 쓰는 것들
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {TECH_STACK.map(({ label, icon, color }) => (
                <span
                  key={label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-sans font-medium",
                    color
                  )}
                >
                  {icon}
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted text-xs font-sans text-muted-foreground">
              <Icon icon="lucide:book-open" width={12} className="shrink-0" />
              {githubData?.public_repos ?? 0} repos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted text-xs font-sans text-muted-foreground">
              <Icon icon="lucide:users" width={12} className="shrink-0" />
              {githubData?.followers ?? 0} followers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-muted text-xs font-sans text-muted-foreground">
              <Icon icon="lucide:user-plus" width={12} className="shrink-0" />
              {githubData?.following ?? 0} following
            </span>
          </div>

          {/* Meta: location + blog */}
          <div className="flex flex-wrap justify-center gap-4 mb-7">
            {githubData?.location && (
              <span className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
                <Icon icon="lucide:map-pin" width={13} className="shrink-0" />
                {githubData.location}
              </span>
            )}
            {blogHref && (
              <a
                href={blogHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon icon="lucide:link" width={13} className="shrink-0" />
                {githubData?.blog}
              </a>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {githubData?.html_url && (
              <Button variant="default" size="default" asChild>
                <a
                  href={githubData.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Icon icon="mdi:github" width={16} />
                  GitHub 프로필
                </a>
              </Button>
            )}
            {blogHref && (
              <Button variant="outline" size="default" asChild>
                <a
                  href={blogHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Icon icon="lucide:external-link" width={16} />
                  블로그
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SplitHero;
