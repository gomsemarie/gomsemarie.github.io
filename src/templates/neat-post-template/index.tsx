import { MDXProvider } from "@mdx-js/react";
import { Link, PageProps } from "gatsby";
import React from "react";
import { TemplateDiv } from "./style";
import { Toc, TocItem } from "@_components";

interface NeatPostTemplateProps {
  data: Queries.PostDetailQuery;
  children: React.ReactNode;
}

export default function NeatPostTemplate({
  data,
  children,
}: NeatPostTemplateProps) {
  const toc = data.mdx?.tableOfContents as TocItem | undefined;
  const anchorHolder = document.getElementsByClassName("anchor-header");

  return (
    <TemplateDiv data-template="neat-post">
      <div className="contents-area">
        <h1>{data.mdx?.frontmatter?.title}</h1>
        {children}
      </div>
      <div className="toc-area">
        <Toc.Icon toc={toc} anchorHolder={anchorHolder} />
      </div>
    </TemplateDiv>
  );
}
