import React from "react";
import { graphql } from "gatsby";
import { Markdown, Page } from "../../types/markdown";

export const BlogPostPage: React.FC<{ data: Markdown<Page> }> = ({ data }) => {
  const { blogPost } = data;
  const { frontmatter, html } = blogPost;
  const { slug, title, author } = frontmatter;

  return (
    <article>
      <header>
        <h1>{title}</h1>
        <p>
          <em>Written by {author}</em>
        </p>
      </header>
      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
};

export const pageQuery = graphql`
  query ($id: String!) {
    blogPost: markdownRemark(
      id: { eq: $id }
      fileAbsolutePath: { regex: "/blog-posts/" }
    ) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        slug
        title
      }
    }
  }
`;

export default BlogPostPage;
