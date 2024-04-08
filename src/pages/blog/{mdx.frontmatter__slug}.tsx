import { PageProps, graphql, useStaticQuery } from "gatsby";
import { NeatPostTemplate } from "@_templates";
import React from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";

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
  const shortcodes = { Text };

  return (
    <main data-page="blog-post-page">
      <MDXProvider components={shortcodes}>
        <NeatPostTemplate data={data}>{children}</NeatPostTemplate>
      </MDXProvider>
    </main>
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
    }
  }
`;
