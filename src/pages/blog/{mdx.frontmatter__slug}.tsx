import { PageProps, graphql } from "gatsby";
import { NeatPostTemplate } from "@_templates";
import React from "react";
import { MDXProvider } from "@mdx-js/react";

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
  data,
  children,
}: PageProps<Queries.PostDetailQuery>) {
  const shortcodes = { Text };

  return (
    <main data-page="blog-post-page">
      <MDXProvider components={shortcodes}>
        <NeatPostTemplate data={data}>{children}</NeatPostTemplate>
      </MDXProvider>
    </main>
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
    }
  }
`;
