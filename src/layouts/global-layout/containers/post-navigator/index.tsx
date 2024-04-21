import React, { useEffect, useId, useState } from "react";
import { usePostCategories } from "@_hooks";
import _ from "lodash";
import { PostNavigatorUl } from "./style";
import { Link } from "gatsby";

export type CategoryInfo = {
  name: string;
  slug: string;
  items: Record<string, CategoryInfo> | undefined;
  count: number;
};

export default function PostNavigator() {
  const id = useId();
  const data = usePostCategories();
  const group = data.allMdx.group;
  const [categories, setCategories] = useState<Record<string, CategoryInfo>>(
    {}
  );

  const makeCategories = () => {
    const menuList: Record<string, CategoryInfo> = {};
    group.map((category) => {
      const splited = category.fieldValue?.split("/");

      if (splited !== undefined) {
        let nowLoc = menuList;
        let slug = "";

        splited.map((name, index) => {
          slug = _.kebabCase(`${slug !== "" ? `${slug}/` : ""}${name}`);
          nowLoc[name] = {
            ...nowLoc[name],
            name,
            slug,
            count: (nowLoc[name]?.count ?? 0) + 1,
          };

          if (index + 1 !== splited.length) {
            nowLoc[name].items = {
              ...nowLoc[name].items,
            };
            nowLoc = nowLoc[name].items!;
          }
        });
      }
    });

    return menuList;
  };

  const printCategories = (record: Record<string, CategoryInfo>) => {
    return Object.keys(record).map((key) => {
      const info = record[key];

      return (
        <li key={`${id}-${info.slug}`}>
          <p>
            {info.items !== undefined ? (
              info.name
            ) : (
              <Link to={`/${process.env.GATSBY_CATEGORIES_PATH}/${info.slug}`}>
                {info.name}
              </Link>
            )}
          </p>

          {info.items !== undefined ? (
            <ul>{printCategories(info.items)}</ul>
          ) : null}
        </li>
      );
    });
  };

  useEffect(() => {
    setCategories(makeCategories());
  }, [data]);

  return (
    <PostNavigatorUl data-container="post-navigator">
      {printCategories(categories)}
    </PostNavigatorUl>
  );
}
