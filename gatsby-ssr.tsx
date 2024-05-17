import React from "react";
import type { GatsbySSR } from "gatsby";
import { GlobalLayout } from "@_layouts";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@_styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => {
  const queryClient = new QueryClient();
  return (
    <>
      <script
        src="https://kit.fontawesome.com/ddb7bb7cca.js"
        crossOrigin="anonymous"
      ></script>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <ThemeProvider theme={lightTheme}>{element}</ThemeProvider>
      </QueryClientProvider>
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
