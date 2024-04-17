import { graphql, useStaticQuery } from "gatsby";

const query = graphql`
  query {
    site {
      siteMetadata {
        title
        description
        author
        siteUrl
      }
    }
  }
`;

export const useSiteMetadata = () => {
  const data = useStaticQuery(query);

  return data.site.siteMetadata;
};
export { query as siteMetadataQuery };
