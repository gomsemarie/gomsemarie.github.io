import { graphql, useStaticQuery } from "gatsby";

export const postTagsQuery = graphql`
  query PostTags {
    allMdx(limit: 2000) {
      group(field: { frontmatter: { tags: SELECT } }) {
        fieldValue
      }
    }
  }
`;

export const usePostTags = () => {
  const data: Queries.PostTagsQuery = useStaticQuery(postTagsQuery);
  return data;
};
