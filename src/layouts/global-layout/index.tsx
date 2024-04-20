import React, { createRef, useEffect, useState } from "react";
import { GlobalStyle } from "@_styles";
import { LayoutDiv, SideBarDiv } from "./style";
import { usePostCategories } from "@_hooks/query/use-post-categories";
import _ from "lodash";

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
  slug: string;
  items: Record<string, MenuItem> | undefined;
  count: number;
};

function PostNavigator() {
  const data = usePostCategories();
  const group = data.allMdx.group;
  const [menuList, setMenuList] = useState<Record<string, MenuItem>>({});

  const makeMenuList = () => {
    const menuList: Record<string, MenuItem> = {};
    group.map((category) => {
      const splited = category.fieldValue?.split('/');

      if (splited !== undefined) {
        let nowLoc = menuList;
        let slug = '';

        splited.map((name, index) => {
          slug = _.kebabCase(`${slug !== '' ? `${slug}/` : ''}${name}`);
          nowLoc[name] = {
            ...nowLoc[name],
            name,
            slug,
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
