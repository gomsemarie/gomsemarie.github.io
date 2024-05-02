import React, { useEffect, useId, useState } from "react";
import { usePostCategories } from "@_hooks";
import _ from "lodash";
import { PostNavigatorLi, PostNavigatorUl } from "./style";
import { Link } from "gatsby";
import classNames from "classnames";
import { useToggle } from "usehooks-ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleRight, faCode } from "@fortawesome/free-solid-svg-icons";

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

  useEffect(() => {
    setCategories(makeCategories());
  }, [data]);

  return (
    <PostNavigatorUl data-container="post-navigator">
      {Object.keys(categories).map((key) => (
        <PostNavigator.Item
          key={`${id}-${categories[key].slug}`}
          info={categories[key]}
        />
      ))}
    </PostNavigatorUl>
  );
}

interface PostNavigatorItemProps {
  info: CategoryInfo;
  inner?: boolean;
}
PostNavigator.Item = ({ info, inner = false }: PostNavigatorItemProps) => {
  const id = useId();
  const [active, toggleActive] = useToggle(false);
  const [hover, setHover] = useState<boolean>(false);

  return (
    <PostNavigatorLi
      className={classNames({ active, inner })}
      onClick={toggleActive}
      onMouseOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onMouseOut={(e) => {
        e.stopPropagation();
        setHover(false);
      }}
    >
      <div className="title-box">
        {inner ? (
          <FontAwesomeIcon
            icon={faAngleRight}
            className={classNames("mark-icon")}
            size="xs"
          />
        ) : null}
        <span className="icon-box">
          <FontAwesomeIcon icon={faCode} bounce={hover} size="xs" />
        </span>
        <p>
          {info.items !== undefined ? (
            info.name
          ) : (
            <Link to={`/${process.env.GATSBY_CATEGORIES_PATH}/${info.slug}`}>
              {info.name}
            </Link>
          )}
        </p>
        {inner ? null : (
          <FontAwesomeIcon
            icon={faAngleRight}
            rotation={active ? 90 : undefined}
            size="xs"
          />
        )}
      </div>

      {info.items !== undefined ? (
        <ul>
          {Object.keys(info.items).map((key) => (
            <PostNavigator.Item
              key={`${id}-${info.items![key].slug}`}
              info={info.items![key]}
              inner
            />
          ))}
        </ul>
      ) : null}
    </PostNavigatorLi>
  );
};
