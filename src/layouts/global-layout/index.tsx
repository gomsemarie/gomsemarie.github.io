import React from "react";
import { Link } from "gatsby";
import { Icon } from "@iconify/react";

import { GlobalFooter, LayoutDiv } from "./style";
import { GlobalStyle } from "@_styles";
import { SiteHeader } from "@_components/site-header";
import { useCategoryConfig } from "../../hooks/useCategoryConfig";

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

function Footer() {
  const categories = useCategoryConfig();

  return (
    <GlobalFooter>
      <div className="border-t border-border bg-muted/40 shadow-top-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
          {/* Row 1 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <span className="font-maple text-lg">gomsemarie</span>
              <span className="font-sans text-xs text-muted-foreground">
                코드로 빚는 개발, 손으로 빚는 칵테일
              </span>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              <Link to="/" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">홈</Link>
              {categories.filter((c) => c.showInNav).map((c) => (
                <Link
                  key={c.categoryId}
                  to={c.href}
                  className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {c.label}
                </Link>
              ))}
              <Link to="/tags/" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">태그</Link>
            </nav>
          </div>
          {/* Row 2 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span className="font-sans text-xs text-muted-foreground">
              © 2025 gomsemarie. Built with Gatsby &amp; React.
            </span>
            <a
              href={`https://github.com/${process.env.GATSBY_GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon icon="mdi:github" width={20} />
            </a>
          </div>
        </div>
      </div>
    </GlobalFooter>
  );
}
