import * as React from "react";
import { graphql, PageProps } from "gatsby";
import { SEOComponent } from "@_components";

type DataProps = {
  site: {
    siteMetadata: {
      title: string;
    };
  };
};

// test
const IndexRoute = ({ data: { site } }: PageProps<DataProps>) => {
  return (
    <main>
      <h1>{site.siteMetadata.title}</h1>
    </main>
  );
};

export function Head() {
  return <SEOComponent />;
}

export default IndexRoute;

export const query = graphql`
  {
    site {
      siteMetadata {
        title
      }
    }
  }
`;
