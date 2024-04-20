import { PageProps, graphql } from "gatsby";
import React from "react";
import { PageMain } from "./style";
import { SEOComponent, Toc, TocItem } from "@_components";
import { isBrowser } from "@_utils";
import DesignSystem from "@_components/design-system";
import { MDXProvider } from "@mdx-js/react";

export default function PostTemplate({
  pageContext,
  data,
  children,
}: PageProps<Queries.PostDetailQuery>) {
  const toc = data.mdx?.tableOfContents as TocItem | undefined;
  const anchorHolder = isBrowser()
    ? document.getElementsByClassName("anchor-header")
    : undefined;

  const shortcodes = { Text: DesignSystem.Text };

  return (
    <MDXProvider
      disableParentContext
      components={{
        ...shortcodes,
        // em: DesignSystem.Em,
      }}
    >
      <PageMain data-page="post">
        <div className="toc-area">
          <Toc.Icon toc={toc} anchorHolder={anchorHolder} />
        </div>
        <div className="contents-area">
          <h1>{data.mdx?.frontmatter?.title}</h1>
          {children}
        </div>
      </PageMain>
    </MDXProvider>
  );
}

export function Head({ data }: PageProps<Queries.PostDetailQuery>) {
  return (
    <SEOComponent
      title={data.mdx?.frontmatter?.title ?? ""}
      description={data.mdx?.frontmatter?.description ?? ""}
    />
  );
}

export const query = graphql`
  query PostDetail($slug: String) {
    mdx(frontmatter: { slug: { eq: $slug } }) {
      frontmatter {
        slug
        date
        title
        description
        tags
        menu
      }
      excerpt(pruneLength: 250)
      tableOfContents
    }
  }
`;
