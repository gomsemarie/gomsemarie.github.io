import React from "react";
import { Link } from "gatsby";
import { Icon } from "@iconify/react";

import { GlobalFooter, LayoutDiv } from "./style";
import { GlobalStyle } from "@_styles";
import { SiteHeader } from "@_components/site-header";
import { useCategoryConfig } from "../../hooks/useCategoryConfig";
import { cn } from "../../lib/utils";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

function GlobalLayout({ children }: GlobalLayoutProps) {
  return (
    <>
      <GlobalStyle />
      <LayoutDiv data-layout="default-layout">
        <Header />
        <div className="contents-area" style={{ flex: 1 }}>{children}</div>
        <Footer />
      </LayoutDiv>
    </>
  );
}

export default GlobalLayout;

function Header() {
  return <SiteHeader />;
}

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    href: `https://github.com/${process.env.GATSBY_GITHUB_USERNAME}`,
    icon: "mdi:github",
  },
];

function Footer() {
  const categories = useCategoryConfig();
  const currentYear = new Date().getFullYear();

  return (
    <GlobalFooter>
      <footer className="relative border-t border-border overflow-hidden">
        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(to right, transparent, hsl(258 88% 62%), hsl(336 80% 60%), transparent)",
          }}
        />

        <div className="relative bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            {/* Main footer content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 py-12 md:py-16">
              {/* Brand column */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Link to="/" className="inline-flex items-center gap-2 group mb-3">
                  <span className="font-maple text-xl text-foreground group-hover:text-primary transition-colors duration-200">
                    gomsemarie
                  </span>
                </Link>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
                  코드로 빚는 개발, 손으로 빚는 칵테일
                </p>

                {/* Social links */}
                <div className="flex items-center gap-2 mt-5">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className={cn(
                        "inline-flex items-center justify-center w-9 h-9 rounded-lg",
                        "bg-muted/60 text-muted-foreground",
                        "hover:bg-primary hover:text-primary-foreground",
                        "hover:scale-110 active:scale-95",
                        "transition-all duration-200 ease-out"
                      )}
                    >
                      <Icon icon={link.icon} width={20} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Navigation column */}
              <div>
                <h4 className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                  탐색
                </h4>
                <nav className="flex flex-col gap-2.5">
                  <Link
                    to="/"
                    className="font-sans text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200 inline-flex items-center gap-1.5"
                  >
                    홈
                  </Link>
                  <Link
                    to="/posts/"
                    className="font-sans text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200 inline-flex items-center gap-1.5"
                  >
                    전체 포스트
                  </Link>
                  <Link
                    to="/tags/"
                    className="font-sans text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200 inline-flex items-center gap-1.5"
                  >
                    태그
                  </Link>
                </nav>
              </div>

              {/* Categories column */}
              <div>
                <h4 className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                  카테고리
                </h4>
                <nav className="flex flex-col gap-2.5">
                  {categories
                    .filter((c) => c.showInNav)
                    .map((c) => (
                      <Link
                        key={c.categoryId}
                        to={c.href}
                        className="font-sans text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200 inline-flex items-center gap-1.5"
                      >
                        {c.label}
                      </Link>
                    ))}
                </nav>
              </div>

              {/* Tech stack column */}
              <div>
                <h4 className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                  기술 스택
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Gatsby", icon: "logos:gatsby" },
                    { name: "React", icon: "logos:react" },
                    { name: "TypeScript", icon: "logos:typescript-icon" },
                  ].map((tech) => (
                    <span
                      key={tech.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-sans text-muted-foreground"
                    >
                      <Icon icon={tech.icon} width={12} />
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="font-sans text-xs text-muted-foreground/60 text-center sm:text-left">
                © {currentYear} gomsemarie. Built with Gatsby &amp; React.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="맨 위로"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "text-xs font-sans text-muted-foreground/60",
                  "hover:text-foreground hover:bg-muted",
                  "transition-all duration-200"
                )}
              >
                <Icon icon="lucide:arrow-up" width={12} />
                맨 위로
              </button>
            </div>
          </div>
        </div>
      </footer>
    </GlobalFooter>
  );
}
