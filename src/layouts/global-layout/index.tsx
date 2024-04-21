import React from "react";
import { GlobalStyle } from "@_styles";
import { LayoutDiv, SideBarDiv } from "./style";
import { PostNavigator } from "./containers";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

function GlobalLayout({ children }: GlobalLayoutProps) {
  return (
    <>
      <GlobalStyle />
      <script
        src="https://kit.fontawesome.com/ddb7bb7cca.js"
        crossOrigin="anonymous"
      ></script>
      <LayoutDiv data-layout="default-layout">
        <aside className="side-bar-area">
          <SideBar />
        </aside>
        <div className="contents-area">{children}</div>
      </LayoutDiv>
    </>
  );
}

export default GlobalLayout;

function Header() {
  return <div data-container="header"></div>;
}

function Navigation() {
  return <div data-container="navigation"></div>;
}

function SideBar() {
  const githubProfileUrl = process.env.GATSBY_GITHUB_PROFILE_URL;

  return (
    <SideBarDiv data-container="side-bar">
      <PostNavigator />
    </SideBarDiv>
  );
}

function Footer() {
  return <div data-container="footer"></div>;
}

// parameter (query string) /collection?id=adsa
// slug (dynamic path params) /collection/:id
// data (body) post body object

// /collection?id=sdsa
const inputValue = {
  parameter: {},
};
