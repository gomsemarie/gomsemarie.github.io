import { MDXProvider } from "@mdx-js/react";
import { PageProps } from "gatsby";
import React from "react";

interface NeatPostTemplateProps {
  data: Queries.PostDetailQuery;
  children: React.ReactNode;
}

export default function NeatPostTemplate({
  data,
  children,
}: NeatPostTemplateProps) {
  return (
    <>
      <h1>{data.mdx?.frontmatter?.title}</h1>
      {children}
    </>
  );
}
