import { PageProps, graphql } from "gatsby";
import { NeatPostTemplate } from "@_templates";
import React from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";
import DesignSystem from "@_components/design-system";
import styled from "styled-components";

export const PageMain = styled.main``;

export default function BlogPage({
  data,
  children,
}: PageProps<Queries.PostDetailQuery>) {
  // const table = data.mdx?.tableOfContents;
  const shortcodes = { Text: DesignSystem.Text };

  return (
    <NeatPostTemplate data={data}>
      <PageMain data-page="blog-post-page">
        <MDXProvider
          disableParentContext
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

export function Head({ data }: PageProps<Queries.PostDetailQuery>) {
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
        tags
      }
      excerpt(pruneLength: 250)
      tableOfContents
    }
  }
`;
