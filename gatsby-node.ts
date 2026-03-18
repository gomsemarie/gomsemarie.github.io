import type { GatsbyNode } from "gatsby";
import path from "path";
import fs from "fs";
import _ from "lodash";
import crypto from "crypto";

// ─── CategoryConfig schema + nodes ────────────────────────────────────────────

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] = ({ actions }) => {
  actions.createTypes(`
    type CategoryConfig implements Node {
      categoryId: String!
      label: String!
      labelEn: String!
      icon: String!
      colorTheme: String!
      showInNav: Boolean!
      navOrder: Int!
    }
  `);
};

export const sourceNodes: GatsbyNode["sourceNodes"] = ({ actions, reporter }) => {
  const { createNode } = actions;
  const contentsDir = path.resolve("src/contents");
  if (!fs.existsSync(contentsDir)) return;

  const folders = fs.readdirSync(contentsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders) {
    const jsonPath = path.join(contentsDir, folder.name, "category.json");
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const node = {
        ...raw,
        id: `CategoryConfig-${raw.categoryId}`,
        parent: null,
        children: [],
        internal: {
          type: "CategoryConfig",
          contentDigest: crypto.createHash("md5").update(JSON.stringify(raw)).digest("hex"),
        },
      };
      createNode(node);
    } catch {
      reporter.warn(`Failed to parse category.json in ${folder.name}`);
    }
  }
};

export const createPages: GatsbyNode["createPages"] = async ({
  actions,
  graphql,
  reporter,
}) => {
  const { createPage } = actions;

  /**-----------------------------------------------------------------------------------------------------------------------------------------
   * /categories/:category
   *------------------------------------------------------------------------------------------------------------------------------------------*/
  const categoryResult = await graphql<Queries.CategoriesNodeQuery>(`
    query CategoriesNode {
      allMdx(limit: 2000) {
        group(field: { frontmatter: { category: SELECT } }) {
          fieldValue
        }
      }
    }
  `);

  if (categoryResult.errors) {
    reporter.panicOnBuild("Error loading Tags result", categoryResult.errors);
  }

  const categoryTemplate = path.resolve(
    "src/templates/category-template/index.tsx"
  );
  const categories = categoryResult.data?.allMdx.group;

  categories?.forEach((category) => {
    const fieldValue = category.fieldValue;

    fieldValue != null &&
      createPage({
        path: `/${process.env.GATSBY_CATEGORIES_PATH}/${_.kebabCase(
          fieldValue
        )}/`,
        component: categoryTemplate,
        context: {
          category: category.fieldValue,
        },
      });
  });

  // 상위 카테고리 페이지 생성 — frontmatter 기반 (기존 방식)
  const parentCategoryTemplate = path.resolve(
    "src/templates/parent-category-template/index.tsx"
  );
  const seenParents = new Set<string>();
  categories?.forEach((category) => {
    const fieldValue = category.fieldValue;
    if (!fieldValue) return;
    const parts = fieldValue.split("/");
    if (parts.length > 1) {
      const parent = parts[0].trim();
      if (!seenParents.has(parent)) {
        seenParents.add(parent);
        createPage({
          path: `/${process.env.GATSBY_CATEGORIES_PATH}/${_.kebabCase(parent)}/`,
          component: parentCategoryTemplate,
          context: {
            parentCategory: parent,
            categoryRegex: `/^${parent}/i`,
          },
        });
      }
    }
  });

  // 상위 카테고리 페이지 생성 — category.json 기반 (자동 추가)
  // 새 폴더 + category.json 만들면 코드 변경 없이 카테고리 페이지가 생성됨
  const contentsDir = path.resolve("src/contents");
  if (fs.existsSync(contentsDir)) {
    const folders = fs.readdirSync(contentsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const folder of folders) {
      const jsonPath = path.join(contentsDir, folder.name, "category.json");
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const config = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const categoryId: string = config.categoryId;
        if (!categoryId || seenParents.has(categoryId)) continue;
        seenParents.add(categoryId);
        createPage({
          path: `/${process.env.GATSBY_CATEGORIES_PATH}/${_.kebabCase(categoryId)}/`,
          component: parentCategoryTemplate,
          context: {
            parentCategory: categoryId,
            categoryRegex: `/^${categoryId}/i`,
          },
        });
      } catch {
        reporter.warn(`category.json parse error in ${folder.name}`);
      }
    }
  }

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
        path: `/${process.env.GATSBY_TAGS_PATH}/${_.kebabCase(fieldValue)}/`,
        component: tagTemplate,
        context: {
          tag: tag.fieldValue,
        },
      });
  });

  /**-----------------------------------------------------------------------------------------------------------------------------------------
   * /posts/:slug
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
        path: `/${process.env.GATSBY_POSTS_PATH}/${_.kebabCase(
          node.frontmatter?.slug ?? ""
        )}/`,
        // Provide the path to the MDX content file so webpack can pick it up and transform it into JSX
        component: `${postTemplate}?__contentFilePath=${node.internal.contentFilePath}`,
        // You can use the values in this context in
        // our page layout component
        context: { id: node.id, slug: node.frontmatter?.slug },
      });
  });
};
