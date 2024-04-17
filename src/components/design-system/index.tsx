import { Component, ReactNode } from "@mdx-js/react/lib";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";

const DesignSystem = {
  Em: function (
    props: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
  ): ReactNode {
    const { children } = props;
    return (
      <em {...props} className="code-code">
        gom{children}
      </em>
    );
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
