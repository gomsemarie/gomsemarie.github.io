import { Link, PageProps, graphql, useStaticQuery } from "gatsby";
import { NeatPostTemplate } from "@_templates";
import React from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";
import { PageMain } from "./style";
import DesignSystem from "@_components/design-system";

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

export default function BlogPostPage({
  children,
}: PageProps<Queries.PostDetailQuery>) {
  const data: Queries.PostDetailQuery = useStaticQuery(query);
  const table = data.mdx?.tableOfContents;
  const shortcodes = { Text };

  return (
    <NeatPostTemplate data={data}>
      <PageMain data-page="blog-post-page">
        <MDXProvider
          components={{
            ...shortcodes,
            // em: DesignSystem.Em,
          }}
        >
          {children}
        </MDXProvider>
      </PageMain>
    </NeatPostTemplate>
  );
}

export function Head() {
  const data: Queries.PostDetailQuery = useStaticQuery(query);

  return (
    <SEOComponent
      title={data.mdx?.frontmatter?.title ?? ""}
      description={data.mdx?.frontmatter?.description ?? ""}
    />
  );
}

export const query = graphql`
  query PostDetail($frontmatter__slug: String) {
    mdx(frontmatter: { slug: { eq: $frontmatter__slug } }) {
      frontmatter {
        slug
        date
        title
        description
      }
      excerpt(pruneLength: 250)
      tableOfContents
    }
  }
`;
