import { graphql, useStaticQuery } from "gatsby";

export const postMenuQuery = graphql`
  query PostMenu {
    allMdx(limit: 2000) {
      group(field: { frontmatter: { menu: SELECT } }) {
        fieldValue
      }
    }
  }
`;

export const usePostMenu = () => {
  const data: Queries.PostTagsQuery = useStaticQuery(postMenuQuery);
  return data;
};
