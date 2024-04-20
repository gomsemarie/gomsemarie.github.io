import { Link, PageProps, graphql } from "gatsby";
import React, { useEffect } from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";
import DesignSystem from "@_components/design-system";
import styled from "styled-components";
import { TemplateDiv } from "./style";

export const PageMain = styled.main``;

export default function CategortTemplate({
  pageContext,
  data,
}: PageProps<Queries.PostListByCategoryQuery>) {
  const { category } = pageContext as { category: string | null };
  console.log("data: ", data);
  const { edges, totalCount } = data.allMdx;
  const tagHeader = `${totalCount} post${
    totalCount === 1 ? "" : "s"
  } tagged with "${"aaaa"}"`;

  useEffect(() => {
    console.log("category: ", category);
    console.log("data: ", data);
  }, []);

  return (
    <TemplateDiv data-page="category-page">
      <h1>{tagHeader}</h1>

      <div>
        {edges.map(({ node }) => {
          const { excerpt } = node;
          const { slug, title, date, tags, category } = node.frontmatter ?? {};

          return (
            <div key={slug}>
              <Link to={`/posts/${slug}`}>
                <h3>{title}</h3>
              </Link>

              <p>
                {category}
                {date}
                <span> ● Tag: </span>
                {tags?.map((tag) => (
                  <Link
                    key={tag?.toLowerCase()}
                    to={`/tags/${tag?.toLowerCase()}`}
                  >
                    {tag}
                  </Link>
                ))}
              </p>

              <p>{excerpt}</p>
            </div>
          );
        })}
      </div>
    </TemplateDiv>
  );
}

// export function Head({ data }: PageProps<Queries.PostDetailQuery>) {
//   return (
//     <SEOComponent
//       title={data.mdx?.frontmatter?.title ?? ""}
//       description={data.mdx?.frontmatter?.description ?? ""}
//     />
//   );
// }

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
