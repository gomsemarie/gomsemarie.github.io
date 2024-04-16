import { graphql, useStaticQuery } from "gatsby";

export const usePostList = () => {
  const data: Queries.PostListQuery = useStaticQuery(graphql`
    query PostList {
      allMdx {
        nodes {
          frontmatter {
            title
            slug
            date(formatString: "MMMM DD, YYYY")
          }
        }
      }
    }
  `);

  return data.allMdx.nodes;
};
