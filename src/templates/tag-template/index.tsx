import { PageProps, graphql } from "gatsby";
import React from "react";
import { SEOComponent } from "@_components";
import styled from "styled-components";
import _ from "lodash";
import PostListTemplate from "@_templates/post-list-template";
import { PostCardProps } from "@_components/post-card";

export const PageMain = styled.main``;

export default function TagTemplate({
  pageContext,
  data,
}: PageProps<Queries.PostListByTagQuery>) {
  const { tag } = pageContext as { tag: string | null };
  const { edges, totalCount } = data.allMdx;

  return (
    <PostListTemplate
      title={tag}
      list={edges.map((item) => item.node.frontmatter as PostCardProps)}
      totalCount={totalCount}
    />
  );
}

export function Head({ pageContext }: PageProps<Queries.PostListByTagQuery>) {
  const { tag } = pageContext as { tag: string | null };

  return <SEOComponent title={tag ?? ""} />;
}

export const query = graphql`
  query PostListByTag($tag: String) {
    allMdx(
      limit: 2000
      sort: { frontmatter: { date: DESC } }
      filter: { frontmatter: { tags: { in: [$tag] } } }
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
