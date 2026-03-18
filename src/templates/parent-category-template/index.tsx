import { PageProps, graphql } from "gatsby";
import React from "react";
import { SEOComponent } from "@_components";
import PostListTemplate from "@_templates/post-list-template";
import { PostCardProps } from "@_components/post-card";

export default function ParentCategoryTemplate({
  pageContext,
  data,
}: PageProps<Queries.PostListByParentCategoryQuery>) {
  const { parentCategory } = pageContext as {
    parentCategory: string | null;
    categoryRegex: string;
  };
  const { edges, totalCount } = data.allMdx;

  return (
    <PostListTemplate
      title={parentCategory}
      list={edges.map((item) => item.node.frontmatter as PostCardProps)}
      totalCount={totalCount}
    />
  );
}

export function Head({
  pageContext,
}: PageProps<Queries.PostListByParentCategoryQuery>) {
  const { parentCategory } = pageContext as { parentCategory: string | null };
  return <SEOComponent title={parentCategory ?? ""} />;
}

export const query = graphql`
  query PostListByParentCategory($categoryRegex: String) {
    allMdx(
      limit: 2000
      sort: { frontmatter: { date: DESC } }
      filter: { frontmatter: { category: { regex: $categoryRegex } } }
    ) {
      totalCount
      edges {
        node {
          frontmatter {
            slug
            date(formatString: "YYYY.MM.DD")
            title
            description
            tags
            category
            thumbnail
          }
        }
      }
    }
  }
`;
