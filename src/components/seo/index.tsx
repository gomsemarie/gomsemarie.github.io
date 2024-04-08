import { useSiteMetadata } from "@_hooks/use-site-metadata";
import React from "react";

interface SEOComponentProsp {
  title?: string;
  description?: string;
  pathname?: string;
  children?: React.ReactNode;
}
export default function SEOComponent({
  title,
  description,
  pathname,
  children,
}: SEOComponentProsp) {
  const {
    title: defaultTitle,
    description: defaultDescription,
    author,
    siteUrl,
  } = useSiteMetadata();

  const seo = {
    title: title || defaultTitle,
    description: description || defaultDescription,
    url: `${siteUrl}${pathname || ``}`,
  };

  return (
    <>
      <title>{seo.title}</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={seo.description} />
      <meta property="og:type" content={"website"} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content={"Weezip"} />
      <meta property="og:locale" content={"ko_KR"} />
      {/* <meta property="og:image" content={''} /> */}
      {/* <meta property="og:image:width" content={''} /> */}
      {/* <meta property="og:image:height" content={''} /> */}
      <meta property="twitter:title" content={seo.title} />
      <meta property="twitter:description" content={seo.description} />
      <meta property="twitter:url" content={seo.url} />

      {/* <meta name="keywords" content={keywords} /> */}
      {/* <meta name="image" content={seo.image} /> */}
      {/* <meta name="twitter:card" content="summary_large_image" /> */}
      {/* <meta name="twitter:image" content={seo.image} /> */}
      {/* <meta name="twitter:creator" content={seo.twitterUsername} /> */}
      {/* <link
        rel="icon"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>👤</text></svg>"
      /> */}
      {children}
    </>
  );
}
