import React from "react";
import type { GatsbySSR } from "gatsby";
import { GlobalLayout } from "@_layouts";
import "./src/styles/globals.css";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@_styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeContextProvider } from "./src/contexts/theme-context";

// Prevent dark mode flash (FOUC)
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('dev-bears-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export const onRenderBody: GatsbySSR["onRenderBody"] = ({ setPreBodyComponents }) => {
  setPreBodyComponents([
    React.createElement("script", {
      key: "theme-init",
      dangerouslySetInnerHTML: { __html: themeInitScript },
    }),
  ]);
};

export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => {
  const queryClient = new QueryClient();
  return (
    <>
      {/* <script
        src="https://kit.fontawesome.com/ddb7bb7cca.js"
        crossOrigin="anonymous"
      ></script> */}
      <ThemeContextProvider>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <ThemeProvider theme={lightTheme}>{element}</ThemeProvider>
        </QueryClientProvider>
      </ThemeContextProvider>
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
