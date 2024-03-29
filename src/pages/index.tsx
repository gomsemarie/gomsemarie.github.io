import * as React from "react";
import { graphql, PageProps } from "gatsby";
import "prismjs/themes/prism-tomorrow.css";
import GlobalStyle from "../styles/global";

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
      <GlobalStyle />
      <h1>{site.siteMetadata.title}</h1>
    </main>
  );
};

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
