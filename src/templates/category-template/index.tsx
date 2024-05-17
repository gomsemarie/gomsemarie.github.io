import { PageProps, graphql } from "gatsby";
import React from "react";
import { SEOComponent } from "@_components";
import styled from "styled-components";
import _ from "lodash";
import PostListTemplate from "@_templates/post-list-template";
import { PostCardProps } from "@_components/post-card";

export const PageMain = styled.main``;

export default function CategortTemplate({
  pageContext,
  data,
}: PageProps<Queries.PostListByCategoryQuery>) {
  const { category } = pageContext as { category: string | null };
  const { edges, totalCount } = data.allMdx;

  return (
    <PostListTemplate
      title={category}
      list={edges.map((item) => item.node.frontmatter as PostCardProps)}
      totalCount={totalCount}
    />
  );
}

export function Head({
  pageContext,
}: PageProps<Queries.PostListByCategoryQuery>) {
  const { category } = pageContext as { category: string | null };

  return <SEOComponent title={category ?? ""} />;
}

export const query = graphql`
  query PostListByCategory($category: String) {
    allMdx(
      limit: 2000
      sort: { frontmatter: { date: DESC } }
      filter: { frontmatter: { category: { eq: $category } } }
    ) {
      totalCount
      edges {
        node {
          excerpt
          frontmatter {
            slug
            date(formatString: "MMMM DD, YYYY")
            title
            description
            tags
            category
          }
        }
      }
    }
  }
`;
