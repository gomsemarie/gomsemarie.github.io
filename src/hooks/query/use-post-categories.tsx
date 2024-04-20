import { graphql, useStaticQuery } from "gatsby";

export const postMenuQuery = graphql`
  query PostCategories {
    allMdx(limit: 2000) {
      group(field: { frontmatter: { category: SELECT } }) {
        fieldValue
      }
    }
  }
`;

export const usePostCategories = () => {
  const data: Queries.PostTagsQuery = useStaticQuery(postMenuQuery);
  return data;
};
