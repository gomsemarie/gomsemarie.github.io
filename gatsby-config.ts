import type { GatsbyConfig } from "gatsby";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({
  debug: true,
});

// ─── Auto-discover content folders ────────────────────────────────────────────
// Any subdirectory of src/contents/ is automatically registered as a content source.
// Just create a new folder + category.json inside it — no config change needed.
const contentsDir = path.join(__dirname, "src/contents");
const contentFolderSources = fs
  .readdirSync(contentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({
    resolve: `gatsby-source-filesystem`,
    options: {
      name: d.name,
      path: path.join(contentsDir, d.name),
    },
  }));

const config: GatsbyConfig = {
  siteMetadata: {
    title: process.env.SITE_TITLE,
    description: process.env.SITE_DESCRIPTION,
    author: process.env.SITE_AUTHOR,
    siteUrl: process.env.SITE_URL,
  },
  graphqlTypegen: true,
  plugins: [
    `gatsby-plugin-postcss`,
    `gatsby-plugin-robots-txt`,
    `gatsby-plugin-advanced-sitemap`,
    `gatsby-plugin-sitemap`,
    `gatsby-plugin-tsconfig-paths`,
    `gatsby-plugin-sass`,
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `gomsemarie blog`,
        short_name: `gomsemarie blog`,
        start_url: `/`,
        background_color: `#f7f0eb`,
        theme_color: `#a2466c`,
        display: `standalone`,
        icon: `src/assets/images/gom-ori.jpeg`,
        cache_busting_mode: `none`,
        icon_options: {
          purpose: `any maskable`,
        },
      },
    },
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.mdx`, `.md`],
        gatsbyRemarkPlugins: [
          `gatsby-remark-gifs`,
          `gatsby-remark-copy-linked-files`,
          {
            resolve: `gatsby-remark-autolink-headers`,
            options: {
              className: `anchor-header`,
              maintainCase: false,
              removeAccents: true,
              elements: [`h1`, `h2`, `h3`, `h4`],
            },
          },
          {
            resolve: `gatsby-remark-code-buttons`,
            options: {
              buttonContainerClass: `code-button-container`,
              buttonClass: `code-button`,
              buttonText: ``,
              svgIconClass: `code-copy-icon`,
              svgIcon: `<i class="fa-regular fa-clipboard"></i>`,
              toasterClass: `code-button-toaster`,
              toasterTextClass: `code-button-toaster-text`,
              toasterText: `copied to clipboard`,
              toasterDuration: 5000,
            },
          },
          {
            resolve: `gatsby-remark-external-links`,
            options: {
              target: `_self`,
              rel: `nofollow`,
            },
          },
          {
            resolve: `gatsby-remark-smartypants`,
            options: {
              dashes: `oldschool`,
            },
          },
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1200,
              srcSetBreakpoints: [200, 340, 520, 890, 1200],
            },
          },
          {
            resolve: `gatsby-remark-prismjs`,
            options: {
              classPrefix: `language-`,
              inlineCodeMarker: null,
              aliases: {},
              showLineNumbers: true,
              noInlineHighlight: false,
              languageExtensions: [
                {
                  language: `superscript`,
                  extend: `javascript`,
                  definition: {
                    superscript_types: /(SuperType)/,
                  },
                  insertBefore: {
                    function: {
                      superscript_keywords: /(superif|superelse)/,
                    },
                  },
                },
              ],
              prompt: {
                user: `root`,
                host: `localhost`,
                global: false,
              },
              escapeEntities: {},
            },
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-styled-components`,
      options: {},
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/assets/images/`,
      },
      __key: `images`,
    },
    // Auto-discovered content folder sources
    ...contentFolderSources,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: `${__dirname}/src/pages/`,
      },
      __key: `pages`,
    },
  ],
};

export default config;
