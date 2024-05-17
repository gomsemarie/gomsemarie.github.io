import { PageProps, graphql } from "gatsby";
import React from "react";
import { PostCard } from "@_components";
import styled from "styled-components";
import { TemplateDiv } from "./style";
import _ from "lodash";
import { PostCardProps } from "@_components/post-card";

export const PageMain = styled.main``;

interface PostListTemplateProps {
  title: string | null;
  list: PostCardProps[];
  totalCount: number;
}
export default function PostListTemplate({
  title,
  list,
  totalCount,
}: PostListTemplateProps) {
  return (
    <TemplateDiv data-page="tag-page">
      <section className="title-area">
        <div className="title-box">
          <p>{title}</p>
        </div>
        <div className="count-box">
          <p>{totalCount}개의 게시물이 있습니다.</p>
        </div>
      </section>
      <section className="list-area">
        <div className="list-box">
          {list.map((props, index) => {
            return <PostCard key={`post-card-${index}`} {...props} />;
          })}
        </div>
      </section>
    </TemplateDiv>
  );
}
