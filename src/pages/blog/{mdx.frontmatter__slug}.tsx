import { PageProps, graphql } from "gatsby";
import { NeatPostTemplate } from "../../templates";
import React from "react";

export default function BlogPostPage({
  data,
  children,
}: PageProps<Queries.PostDetailQuery>) {
  return <NeatPostTemplate data={data}>{children}</NeatPostTemplate>;
}

export const query = graphql`
  query PostDetail($frontmatter__slug: String) {
    mdx(frontmatter: { slug: { eq: $frontmatter__slug } }) {
      frontmatter {
        author
        date
        slug
        title
      }
    }
  }
`;
