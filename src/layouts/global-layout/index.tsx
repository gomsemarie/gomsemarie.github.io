import React, { createRef, useEffect, useState } from "react";
import { GlobalStyle } from "@_styles";
import { LayoutDiv, SideBarDiv } from "./style";
import { usePostMenu } from "@_hooks/query/use-post-menu";

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

  return <SideBarDiv data-container="side-bar"><PostNavigator /></SideBarDiv>;
}

type MenuItem = {
  name: string;
  items: Record<string, MenuItem> | undefined;
  count: number;
};

function PostNavigator() {
  const data = usePostMenu();
  const group = data.allMdx.group;
  const [menuList, setMenuList] = useState<Record<string, MenuItem>>({});

  const makeMenuList = () => {
    const menuList: Record<string, MenuItem> = {};
    group.map((menu) => {
      const splited = menu.fieldValue?.split('/');

      if (splited !== undefined) {
        let nowLoc = menuList;

        splited.map((name, index) => {
          nowLoc[name] = {
            ...nowLoc[name],
            name,
            count: (nowLoc[name]?.count ?? 0) + 1, 
          };

          if (index + 1 !== splited.length) {
            nowLoc[name].items = {
              ...nowLoc[name].items,
            };
            nowLoc = nowLoc[name].items!;
          }
        });
      }
    });

    return menuList;
  }

  useEffect(() => {
    setMenuList(makeMenuList())
  }, [data])

  useEffect(() => {
    console.log(menuList);
  }, [menuList])

  return <nav data-component="post-navigator">
    
  </nav>
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
