import { ReactNode } from "@mdx-js/react/lib";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import {
  StyledEm,
  StyledH1,
  StyledH2,
  StyledH3,
  StyledH4,
  StyledHr,
} from "./style";

const DesignSystem = {
  H1: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return <StyledH1 {...props}>{children}</StyledH1>;
  },
  H2: function (
    props: DetailedHTMLProps<
      HTMLAttributes<HTMLHeadingElement>,
      HTMLHeadingElement
    >
  ): ReactNode {
    const { children } = props;
    return <StyledH2 {...props}>{children}</StyledH2>;
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
  Text: function ({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          backgroundColor: "red",
        }}
      >
        {children}
      </div>
    );
  },
};

export default DesignSystem;
