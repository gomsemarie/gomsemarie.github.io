import { Link, PageProps, graphql } from "gatsby";
import React, { useEffect } from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";
import DesignSystem from "@_components/design-system";
import styled from "styled-components";

export const PageMain = styled.main``;

export default function TagsPage({
  pageContext,
  data,
}: PageProps<Queries.PostListByTagQuery>) {
  const context = pageContext;
  console.log("data: ", data);
  const { edges, totalCount } = data.allMdx;
  const tagHeader = `${totalCount} post${
    totalCount === 1 ? "" : "s"
  } tagged with "${"aaaa"}"`;

  useEffect(() => {
    console.log("context: ", context);
    console.log("data: ", data);
  }, []);

  return (
    <PageMain data-page="tags-page">
      <h1>{tagHeader}</h1>

      <div>
        {edges.map(({ node }) => {
          const { excerpt } = node;
          const { slug, title, date, tags } = node.frontmatter ?? {};

          return (
            <div key={slug}>
              <Link to={`/posts/${slug}`}>
                <h3>{title}</h3>
              </Link>

              <p>
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
    </PageMain>
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
