import React from "react";

import { GlobalFooter, GlobalHeader, LayoutDiv } from "./style";
import { PostNavigator } from "./containers";
import { GlobalStyle } from "@_styles";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

function GlobalLayout({ children }: GlobalLayoutProps) {
  return (
    <>
      <GlobalStyle />
      <LayoutDiv data-layout="default-layout">
        <Header />
        <div className="contents-area">{children}</div>
        <Footer />
      </LayoutDiv>
    </>
  );
}

export default GlobalLayout;

function Header() {
  const githubProfileUrl = process.env.GATSBY_GITHUB_PROFILE_URL;

  return <GlobalHeader>{/* <PostNavigator /> */}</GlobalHeader>;
}

function Footer() {
  return <GlobalFooter></GlobalFooter>;
}

// parameter (query string) /collection?id=adsa
// slug (dynamic path params) /collection/:id
// data (body) post body object

// /collection?id=sdsa
const inputValue = {
  parameter: {},
};
