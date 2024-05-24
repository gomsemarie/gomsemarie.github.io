import { ReactNode } from "@mdx-js/react/lib";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import {
  StyledBlockquote,
  StyledEm,
  StyledH1,
  StyledH2,
  StyledH3,
  StyledH4,
  StyledHr,
  StyledImg,
  StyledTip,
} from "./style";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { myPalette } from "@_styles";
import { useTheme } from "styled-components";

const DesignSystem = {
  H1: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return (
      <StyledH1 {...props}>
        {children}
        <span />
        <hr className="highlight" />
        <hr />
      </StyledH1>
    );
  },
  H2: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return (
      <StyledH2 {...props}>
        <span className="line" />
        {children}
      </StyledH2>
    );
  },
  H3: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return <StyledH3 {...props}>{children}</StyledH3>;
  },
  H4: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return <StyledH4 {...props}>{children}</StyledH4>;
  },
  Em: function (
    props: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  ): ReactNode {
    const { children } = props;
    return <StyledEm {...props}>{children}</StyledEm>;
  },
  Hr: function (
    props: DetailedHTMLProps<HTMLAttributes<HTMLHRElement>, HTMLHRElement>
  ): ReactNode {
    return <StyledHr {...props} />;
  },
  Blockquote: function (
    props: DetailedHTMLProps<HTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>
  ): ReactNode {
    const { children } = props;
    return <StyledBlockquote {...props}>{children}</StyledBlockquote>;
  },
  // Custom
  Tip: function ({
    title = "",
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) {
    const theme = useTheme();
    return (
      <StyledTip>
        <div className="title-area">
          <FontAwesomeIcon
            icon={faLightbulb}
            size="xl"
            color={myPalette("orange", 3)({ theme })}
          />
          <p>Tip</p>
          <p>{title}</p>
        </div>
        <div className="content-area">
          <p>{children}</p>
        </div>
      </StyledTip>
    );
  },
};

export default DesignSystem;
