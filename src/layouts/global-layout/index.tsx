import React from "react";
import { GlobalStyle } from "@_styles";
import { LayoutDiv } from "./style";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

function GlobalLayout({ children }: GlobalLayoutProps) {
  return (
    <>
      <GlobalStyle />
      <LayoutDiv data-layout="default-layout">
        <div>sdsdsddsdsdsdsasdsds</div>
        <div>{children}</div>
      </LayoutDiv>
    </>
  );
}

export default GlobalLayout;

function Header() {
  return <header data-container="header"></header>;
}

function Navigation() {
  return <nav data-container="navigation"></nav>;
}

function SideBar() {
  return <aside data-container="side-bar"></aside>;
}

function Footer() {
  return <footer data-container="footer"></footer>;
}

// parameter (query string) /collection?id=adsa
// slug (dynamic path params) /collection/:id
// data (body) post body object

// /collection?id=sdsa
const inputValue = {
  parameter: {},
};
