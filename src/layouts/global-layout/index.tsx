import React, { useRef } from "react";

import { GlobalFooter, GlobalHeader, LayoutDiv } from "./style";
import { PostNavigator } from "./containers";
import { GlobalStyle, myPalette } from "@_styles";
import { Modal } from "@_components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBurger } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "styled-components";
import { ModalRef } from "@_components/modal";
import { NavigatorArticle } from "@_components/modal/style";

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
  const theme = useTheme();
  const menuModalController = useRef<ModalRef>(null);

  const handleOnClickMenuIcon = () => {
    menuModalController.current?.openModal();
  };

  return (
    <GlobalHeader>
      <section className="icon-area">
        <FontAwesomeIcon
          className="menu-icon"
          icon={faBurger}
          size="2x"
          color={myPalette("gray", 2)({ theme })}
          onClick={handleOnClickMenuIcon}
        />
      </section>
      <Modal ref={menuModalController}>
        <NavigatorArticle className="post-navigator-area">
          <PostNavigator />
        </NavigatorArticle>
      </Modal>
    </GlobalHeader>
  );
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
