import { graphql, useStaticQuery } from "gatsby";

const query = graphql`
  query PostList {
    allMdx {
      nodes {
        frontmatter {
          slug
          date(formatString: "MMMM DD, YYYY")
          title
          description
          tags
        }
      }
    }
  }
`;

export const usePostList = () => {
  const data: Queries.PostListQuery = useStaticQuery(query);

  return data.allMdx.nodes;
};
export { query as postListQuery };
