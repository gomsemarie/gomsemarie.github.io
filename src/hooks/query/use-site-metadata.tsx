import { graphql, useStaticQuery } from "gatsby";

export const siteMetadataQuery = graphql`
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
  const data = useStaticQuery(siteMetadataQuery);
  return data.site.siteMetadata;
};
