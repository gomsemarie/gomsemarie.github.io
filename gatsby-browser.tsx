import React from "react";
import { GlobalLayout } from "@_layouts";
import type { GatsbyBrowser } from "gatsby";

import "prismjs/themes/prism-tomorrow.css"; // Prism - Theme
import "prismjs/plugins/line-numbers/prism-line-numbers.css"; // Prism - Line numbers style
// import "prismjs/plugins/command-line/prism-command-line.css"; // Prism - Command line style
import "sanitize.css";
import "sanitize.css/forms.css";
import "sanitize.css/typography.css";
import { ThemeProvider } from "styled-components";
import { GlobalStyle, lightTheme } from "@_styles";

export const onRouteUpdate: GatsbyBrowser["onRouteUpdate"] = ({
  location,
  prevLocation,
}) => {
  // console.log("new pathname", location.pathname);
  // console.log("old pathname", prevLocation ? prevLocation.pathname : null);
};

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({
  element,
}) => {
  return (
    <>
      <script
        src="https://kit.fontawesome.com/ddb7bb7cca.js"
        crossOrigin="anonymous"
      ></script>
      <ThemeProvider theme={lightTheme}>{element}</ThemeProvider>
    </>
  );
};

// Wraps every page in a component
export const wrapPageElement: GatsbyBrowser["wrapPageElement"] = ({
  element,
  props,
}) => {
  return <GlobalLayout {...props}>{element}</GlobalLayout>;
};

// export const replaceHydrateFunction: GatsbyBrowser["replaceHydrateFunction"] =
//   (): any => {
//     return (element: any, container: any) => {
//       const root = ReactDOM.createRoot(container);
//       root.render(element);
//     };
//   };
