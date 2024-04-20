import { graphql, useStaticQuery } from "gatsby";

export const postListQuery = graphql`
  query PostList {
    allMdx(limit: 2000) {
      nodes {
        frontmatter {
          slug
          date(formatString: "MMMM DD, YYYY")
          title
          description
          tags
          menu
        }
      }
    }
  }
`;

export const usePostList = () => {
  const data: Queries.PostListQuery = useStaticQuery(postListQuery);
  return data;
};
