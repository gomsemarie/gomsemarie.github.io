import { useStaticQuery, graphql } from "gatsby";
import { getTheme, CategoryTheme } from "../lib/category-themes";
import _ from "lodash";

export type CategoryConfig = {
  categoryId: string;
  label: string;
  labelEn: string;
  icon: string;
  colorTheme: string;
  showInNav: boolean;
  navOrder: number;
  /** Derived: URL path e.g. /categories/tech/ */
  href: string;
  /** Derived: theme object */
  theme: CategoryTheme;
};

type RawCategoryNode = {
  categoryId: string;
  label: string;
  labelEn: string;
  icon: string;
  colorTheme: string;
  showInNav: boolean;
  navOrder: number;
};

type AllCategoryConfigQuery = {
  allCategoryConfig: {
    nodes: RawCategoryNode[];
  };
};

export function useCategoryConfig(): CategoryConfig[] {
  const data = useStaticQuery<AllCategoryConfigQuery>(graphql`
    query AllCategoryConfig {
      allCategoryConfig(sort: { navOrder: ASC }) {
        nodes {
          categoryId
          label
          labelEn
          icon
          colorTheme
          showInNav
          navOrder
        }
      }
    }
  `);

  return (data.allCategoryConfig.nodes ?? [])
    .filter((n) => n.categoryId)
    .map((n) => ({
      categoryId: n.categoryId,
      label: n.label ?? n.categoryId,
      labelEn: n.labelEn ?? n.categoryId,
      icon: n.icon ?? "mdi:folder-outline",
      colorTheme: n.colorTheme ?? "slate",
      showInNav: n.showInNav ?? true,
      navOrder: n.navOrder ?? 99,
      href: `/categories/${_.kebabCase(n.categoryId)}/`,
      theme: getTheme(n.colorTheme),
    }));
}
