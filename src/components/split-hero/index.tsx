import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@_components/ui/button";
import { useGithubMyInfo } from "@_hooks";
import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/theme-context";

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

// ─── Parallax hook ───────────────────────────────────────────────────────────

function useParallax() {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            if (rect.bottom > 0) {
              setOffset(window.scrollY * 0.3);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { ref, offset };
}

// ─── Fade-in on mount ────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── SplitHero ───────────────────────────────────────────────────────────────

export function SplitHero() {
  const githubData = useGithubMyInfo();
  const isLoading = githubData === undefined;
  const { ref: parallaxRef, offset } = useParallax();

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

  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="w-full border-b border-border">
      {/* Enhanced gradient background with parallax */}
      <div
        ref={parallaxRef}
        className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Parallax dot grid background */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(circle, hsl(258 30% 20%) 1px, transparent 1px)"
              : "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "hsl(var(--background))",
            transform: `translateY(${offset * 0.5}px)`,
          }}
        />

        {/* Multi-layer gradient overlay with parallax */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Primary radial glow - moves slower */}
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              background: isDark
                ? "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(258 60% 30% / 0.4) 0%, transparent 70%)"
                : "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(258 88% 92% / 0.6) 0%, transparent 70%)",
              transform: `translateY(${offset * 0.2}px)`,
            }}
          />
          {/* Accent glow (rose) - moves at different speed */}
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              background: isDark
                ? "radial-gradient(ellipse 50% 40% at 70% 60%, hsl(336 60% 25% / 0.2) 0%, transparent 70%)"
                : "radial-gradient(ellipse 50% 40% at 70% 60%, hsl(336 80% 90% / 0.3) 0%, transparent 70%)",
              transform: `translateY(${offset * 0.15}px)`,
            }}
          />
          {/* Floating orb decoration */}
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl animate-float opacity-20"
            style={{
              background: isDark
                ? "radial-gradient(circle, hsl(258 80% 50%) 0%, transparent 70%)"
                : "radial-gradient(circle, hsl(258 88% 75%) 0%, transparent 70%)",
              top: "15%",
              left: "10%",
              transform: `translateY(${offset * -0.1}px)`,
            }}
          />
          <div
            className="absolute w-56 h-56 rounded-full blur-3xl animate-float opacity-15"
            style={{
              background: isDark
                ? "radial-gradient(circle, hsl(336 60% 45%) 0%, transparent 70%)"
                : "radial-gradient(circle, hsl(336 80% 80%) 0%, transparent 70%)",
              bottom: "20%",
              right: "8%",
              animationDelay: "3s",
              transform: `translateY(${offset * -0.15}px)`,
            }}
          />
          {/* Edge fade to background */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
        </div>

        {/* Centered content with staggered fade-in */}
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center px-6 py-12 gap-0">

          {/* Avatar with animated gradient ring */}
          <FadeIn delay={100}>
            <div className="relative mb-5 group">
              <div className="absolute -inset-[3px] rounded-full opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-[spin_8s_linear_infinite]" style={{ background: "conic-gradient(from 0deg, hsl(258 88% 62%), hsl(336 80% 60%), hsl(258 88% 62%))" }} />
              <img
                src={githubData?.avatar_url}
                alt={`${githubData?.name ?? "GitHub"} avatar`}
                width={112}
                height={112}
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-2 ring-background"
              />
            </div>
          </FadeIn>

          {/* Handle */}
          <FadeIn delay={200}>
            {githubData?.login && (
              <p className="font-sans text-sm text-muted-foreground mb-2">
                @{githubData.login}
              </p>
            )}
          </FadeIn>

          {/* Role chip */}
          <FadeIn delay={300}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-sans text-muted-foreground mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Frontend Engineer
            </span>
          </FadeIn>

          {/* Name */}
          <FadeIn delay={400}>
            <h1 className="font-maple text-4xl md:text-5xl leading-tight text-foreground tracking-tight mb-3">
              {githubData?.name ?? ""}
            </h1>
          </FadeIn>

          {/* Tagline */}
          <FadeIn delay={500}>
            <p className="font-maple-light text-base text-muted-foreground mb-4 tracking-wide">
              코드로 빚는 개발, 손으로 빚는 칵테일
            </p>
          </FadeIn>

          {/* Bio */}
          <FadeIn delay={600}>
            {githubData?.bio && (
              <p className="font-sans text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
                {githubData.bio}
              </p>
            )}
          </FadeIn>

          {/* Divider */}
          <FadeIn delay={650}>
            <div className="w-16 h-px bg-border mb-6" />
          </FadeIn>

          {/* Tech stack */}
          <FadeIn delay={700}>
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
                      "hover:scale-105 hover:shadow-sm transition-all duration-200",
                      color
                    )}
                  >
                    {icon}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={800}>
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
          </FadeIn>

          {/* Meta: location + blog */}
          <FadeIn delay={900}>
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
          </FadeIn>

          {/* CTA buttons with gradient + shimmer */}
          <FadeIn delay={1000}>
            <div className="flex flex-wrap justify-center gap-3">
              {githubData?.html_url && (
                <a
                  href={githubData.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group/btn relative inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium",
                    "text-white overflow-hidden",
                    "bg-gradient-to-r from-primary via-purple-500 to-rose-500",
                    "bg-[length:200%_100%] animate-gradient-x",
                    "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                    "hover:scale-[1.03] active:scale-[0.98]",
                    "transition-all duration-300 ease-out"
                  )}
                >
                  {/* Shimmer overlay */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer" />
                  <Icon icon="mdi:github" width={16} className="relative z-10" />
                  <span className="relative z-10">GitHub 프로필</span>
                  <Icon
                    icon="lucide:arrow-right"
                    width={14}
                    className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-0.5"
                  />
                </a>
              )}
              {blogHref && (
                <a
                  href={blogHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group/btn relative inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium",
                    "border border-border bg-background text-foreground",
                    "hover:border-primary/40 hover:bg-primary/5",
                    "hover:scale-[1.03] active:scale-[0.98]",
                    "shadow-sm hover:shadow-md",
                    "transition-all duration-300 ease-out"
                  )}
                >
                  <Icon icon="lucide:external-link" width={16} />
                  <span>블로그</span>
                  <Icon
                    icon="lucide:arrow-right"
                    width={14}
                    className="transition-transform duration-300 group-hover/btn:translate-x-0.5"
                  />
                </a>
              )}
            </div>
          </FadeIn>
        </div>

        {/* Scroll indicator */}
        <FadeIn delay={1200} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 animate-pulse-soft">
            <span className="text-[10px] font-sans text-muted-foreground/40 uppercase tracking-widest">
              Scroll
            </span>
            <Icon icon="lucide:chevrons-down" width={16} className="text-muted-foreground/40" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export default SplitHero;
