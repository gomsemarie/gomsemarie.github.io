import { MDXProvider } from "@mdx-js/react";
import { PageProps } from "gatsby";
import React from "react";

function Text({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "red",
      }}
    >
      {children}
    </div>
  );
}

interface NeatPostTemplateProps {
  data: Queries.PostDetailQuery;
  children: React.ReactNode;
}

export default function NeatPostTemplate({
  data,
  children,
}: NeatPostTemplateProps) {
  const shortcodes = { Text };

  return (
    <>
      <h1>{data.mdx?.frontmatter?.title}</h1>
      <MDXProvider components={shortcodes}>{children}</MDXProvider>
    </>
  );
}
