import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import { useLocation } from "@reach/router";
import { Icon } from "@iconify/react";
import { useGithubMyInfo } from "@_hooks";
import { useCategoryConfig } from "../../hooks/useCategoryConfig";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "../theme-toggle";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function navLinkClass(href: string, pathname: string): string {
  const active = isActive(href, pathname);
  const isHome = href === "/";

  if (active && isHome) {
    // 홈 활성: pill 스타일
    return "px-4 py-1.5 rounded-full font-sans text-sm font-medium transition-all duration-200 no-underline bg-primary text-primary-foreground shadow-sm";
  }
  if (active) {
    // 카테고리 활성: 텍스트 강조 + 하단 밑줄
    return "px-4 py-1.5 rounded-full font-sans text-sm font-semibold transition-all duration-200 no-underline text-foreground relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:bg-primary";
  }
  return "px-4 py-1.5 rounded-full font-sans text-sm font-medium transition-all duration-200 no-underline text-foreground/65 hover:text-foreground hover:bg-accent";
}

export function SiteHeader() {
  const githubData = useGithubMyInfo();
  const categories = useCategoryConfig();
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const navLinks = [
    { label: "홈", href: "/" },
    ...categories.filter((c) => c.showInNav).map((c) => ({ label: c.label, href: c.href })),
    { label: "태그", href: "/tags/" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "bg-background/95 backdrop-blur-sm",
        "border-b transition-all duration-200",
        scrolled
          ? "border-border shadow-sm"
          : "border-transparent"
      )}
    >
      {/* Gradient accent bar at very top */}
      <div
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(to right, hsl(258 88% 62%), hsl(336 80% 60%))",
        }}
        aria-hidden="true"
      />

      {/* Main nav bar */}
      <div className="max-w-6xl mx-auto h-[60px] px-4 md:px-8 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline group">
          <div className="relative">
            {githubData?.avatar_url && (
              <img
                src={githubData.avatar_url}
                alt={githubData.name ?? "avatar"}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all duration-200"
              />
            )}
            {/* Online/active dot badge */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
              style={{ background: "hsl(258 88% 62%)" }}
              aria-hidden="true"
            />
          </div>
          <span className="font-maple text-lg text-foreground group-hover:text-primary transition-colors duration-200">
            gomsemarie
          </span>
        </Link>

        {/* Desktop nav (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="주요 메뉴">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={navLinkClass(link.href, pathname)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* GitHub link (desktop only) */}
          {githubData?.html_url && (
            <a
              href={githubData.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="GitHub 프로필"
            >
              <Icon icon="mdi:github" width={20} />
            </a>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-accent transition-all duration-200"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {/* Animated hamburger / close icon */}
            <span className="relative flex items-center justify-center w-5 h-5">
              <Icon
                icon="mdi:close"
                width={20}
                className={cn(
                  "absolute transition-all duration-200",
                  isOpen ? "opacity-100 rotate-0" : "opacity-0 rotate-90"
                )}
              />
              <Icon
                icon="mdi:menu"
                width={20}
                className={cn(
                  "absolute transition-all duration-200",
                  isOpen ? "opacity-0 -rotate-90" : "opacity-100 rotate-0"
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <div
        id="mobile-menu"
        role="navigation"
        aria-label="모바일 메뉴"
        className={cn(
          "md:hidden border-t overflow-hidden transition-all duration-300 ease-in-out",
          "bg-background/98 backdrop-blur-sm",
          isOpen
            ? "max-h-96 opacity-100 border-border"
            : "max-h-0 opacity-0 border-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "px-4 py-3 rounded-xl font-sans text-sm font-medium transition-all duration-200 no-underline",
                isActive(link.href, pathname)
                  ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                  : "text-foreground hover:bg-accent"
              )}
            >
              {link.label}
            </Link>
          ))}
          {githubData?.html_url && (
            <a
              href={githubData.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-sans text-sm font-medium text-foreground hover:bg-accent transition-all duration-200 no-underline"
            >
              <Icon icon="mdi:github" width={16} />
              GitHub
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
