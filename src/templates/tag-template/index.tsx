import { Link, PageProps, graphql } from "gatsby";
import React, { useEffect } from "react";
import { MDXProvider } from "@mdx-js/react";
import { SEOComponent } from "@_components";
import DesignSystem from "@_components/design-system";
import styled from "styled-components";
import { TemplateDiv } from "./style";
import _ from "lodash";

export const PageMain = styled.main``;

export default function TagTemplate({
  pageContext,
  data,
}: PageProps<Queries.PostListByTagQuery>) {
  const { tag } = pageContext as { tag: string | null };
  console.log("data: ", data);
  const { edges, totalCount } = data.allMdx;
  const tagHeader = `${totalCount} post${
    totalCount === 1 ? "" : "s"
  } tagged with "${"aaaa"}"`;

  useEffect(() => {
    console.log("tag: ", tag);
    console.log("data: ", data);
  }, []);

  return (
    <TemplateDiv data-page="tag-page">
      <h1>{tagHeader}</h1>

      <div>
        {edges.map(({ node }) => {
          const { excerpt } = node;
          const { slug, title, date, tags } = node.frontmatter ?? {};

          return (
            <div key={slug}>
              <Link
                to={`/${process.env.GATSBY_POSTS_PATH}/${_.kebabCase(
                  slug ?? ""
                )}`}
              >
                <h3>{title}</h3>
              </Link>

              <p>
                {date}
                <span> ● Tag: </span>
                {tags?.map((tag) => (
                  <Link
                    key={tag?.toLowerCase()}
                    to={`/${process.env.GATSBY_TAGS_PATH}/${_.kebabCase(
                      tag ?? ""
                    )}`}
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
