import type { GatsbyNode } from "gatsby";
import path from "path";
import _ from "lodash";

export const createPages: GatsbyNode["createPages"] = async ({
  actions,
  graphql,
  reporter,
}) => {
  const { createPage } = actions;

  /**-----------------------------------------------------------------------------------------------------------------------------------------
   * /tags/:tag
   *------------------------------------------------------------------------------------------------------------------------------------------*/
  const tagsResult = await graphql<Queries.TagsNodeQuery>(`
    query TagsNode {
      allMdx(limit: 2000) {
        group(field: { frontmatter: { tags: SELECT } }) {
          fieldValue
        }
      }
    }
  `);

  if (tagsResult.errors) {
    reporter.panicOnBuild("Error loading Tags result", tagsResult.errors);
  }

  const tagTemplate = path.resolve("src/templates/tag-template/index.tsx");
  const tags = tagsResult.data?.allMdx.group;

  tags?.forEach((tag) => {
    const fieldValue = tag.fieldValue;

    fieldValue != null &&
      createPage({
        path: `/tags/${_.kebabCase(fieldValue)}/`,
        component: tagTemplate,
        context: {
          tag: tag.fieldValue,
        },
      });
  });

  /**-----------------------------------------------------------------------------------------------------------------------------------------
   * /blog/:slug
   *------------------------------------------------------------------------------------------------------------------------------------------*/
  const postsResult = await graphql<Queries.PostsNodeQuery>(`
    query PostsNode {
      allMdx {
        nodes {
          id
          frontmatter {
            slug
          }
          internal {
            contentFilePath
          }
        }
      }
    }
  `);

  if (postsResult.errors) {
    reporter.panicOnBuild("Error loading MDX result", postsResult.errors);
  }

  const postTemplate = path.resolve(`src/templates/post-template/index.tsx`);
  const posts = postsResult.data?.allMdx.nodes;

  posts?.forEach((node) => {
    node.frontmatter != null &&
      createPage({
        // As mentioned above you could also query something else like frontmatter.title above and use a helper function
        // like slugify to create a slug
        path: `/posts/${node.frontmatter?.slug}`,
        // Provide the path to the MDX content file so webpack can pick it up and transform it into JSX
        component: `${postTemplate}?__contentFilePath=${node.internal.contentFilePath}`,
        // You can use the values in this context in
        // our page layout component
        context: { id: node.id },
      });
  });
};
