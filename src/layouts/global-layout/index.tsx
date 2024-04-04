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
