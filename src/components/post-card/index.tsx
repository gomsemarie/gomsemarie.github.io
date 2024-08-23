import React, { useEffect, useId } from "react";
import { PostCardDiv } from "./style";
import { GithubUserDetailResponse, useGithubMyInfo } from "@_hooks";
import Tag from "@_components/tag";
import _ from "lodash";
import { Link } from "@reach/router";
import { navigate } from "gatsby";
import { myPalette } from "@_styles";
import { useTheme } from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPoo } from "@fortawesome/free-solid-svg-icons";

export interface PostCardProps<T = string | null> {
  slug?: T;
  date?: T;
  title?: T;
  description?: T;
  tags?: T[] | null;
  category?: T;
  thumbnail?: T;
  userInfo?: GithubUserDetailResponse;
}
export default function PostCard(props: PostCardProps) {
  const id = useId();
  const myInfo = useGithubMyInfo();
  const theme = useTheme();

  const slug = _.isNil(props.slug) ? "" : props.slug;
  const date = _.isNil(props.date) ? "" : props.date;
  const title = _.isNil(props.title) ? "" : props.title;
  const description = _.isNil(props.description) ? "" : props.description;
  const tags = _.isNil(props.tags) ? [] : props.tags;
  const category = _.isNil(props.category) ? "" : props.category;
  const thumbnail = _.isNil(props.thumbnail) ? "" : props.thumbnail;

  const handleOnClick = () => {
    navigate(`/${process.env.GATSBY_POSTS_PATH}/${_.kebabCase(slug)}/`);
  };

  return (
    <PostCardDiv onClick={handleOnClick}>
      <div className="thumbnail-area">
        <img
          src={
            !_.isEmpty(thumbnail)
              ? thumbnail
              : "https://img1.daumcdn.net/thumb/R750x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2FE2WEz%2Fbtr1dlPVeOv%2FmC4Lg9is6KBPqGvm1xTRc1%2Fimg.webp"
          }
          alt="thumbnail"
        />
      </div>
      <div className="contents-area">
        <div className="tag-box">
          {tags.map((tag, index) => (
            <Tag
              key={`${id}-tag-${index}`}
              // color={myPalette("gray", 0)({ theme })}
            >
              {tag}
            </Tag>
          ))}
        </div>
        <div className="title-box">
          <p>
            {/* <FontAwesomeIcon className="icon" icon={faPoo} size="lg" /> */}
            {title}
          </p>
        </div>
        <div className="desc-box">
          <p>{description}</p>
        </div>
        {myInfo !== undefined ? (
          <div className="writer-info-box">
            <img src={myInfo.avatar_url} alt={myInfo.login} />
            <p>{myInfo.login}</p>
          </div>
        ) : null}
      </div>
    </PostCardDiv>
  );
}
