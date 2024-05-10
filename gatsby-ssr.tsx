import React from "react";
import type { GatsbySSR } from "gatsby";
import { GlobalLayout } from "@_layouts";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@_styles";

export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => {
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
export const wrapPageElement: GatsbySSR["wrapPageElement"] = ({
  element,
  props,
}) => {
  return <GlobalLayout {...props}>{element}</GlobalLayout>;
};
