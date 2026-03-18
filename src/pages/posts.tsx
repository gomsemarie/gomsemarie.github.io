import React from "react";
import { graphql, PageProps } from "gatsby";
import { SEOComponent } from "@_components";
import PostListTemplate from "@_templates/post-list-template";
import { PostCardProps } from "@_components/post-card";

type DataProps = {
  allMdx: {
    nodes: Array<{
      frontmatter: {
        slug: string | null;
        date: string | null;
        title: string | null;
        description: string | null;
        tags: ReadonlyArray<string | null> | null;
        category: string | null;
        thumbnail: string | null;
      } | null;
    }>;
    totalCount: number;
  };
};

const PostsPage = ({ data }: PageProps<DataProps>) => {
  const list: PostCardProps[] = data.allMdx.nodes
    .filter((n) => n.frontmatter != null)
    .map((n) => ({
      slug: n.frontmatter!.slug,
      date: n.frontmatter!.date,
      title: n.frontmatter!.title,
      description: n.frontmatter!.description,
      tags: n.frontmatter!.tags as string[],
      category: n.frontmatter!.category,
      thumbnail: n.frontmatter!.thumbnail,
    }));

  return (
    <PostListTemplate
      title="모든 포스트"
      list={list}
      totalCount={data.allMdx.totalCount}
    />
  );
};

export default PostsPage;
export const Head = () => <SEOComponent />;

export const query = graphql`
  {
    allMdx(sort: { frontmatter: { date: DESC } }) {
      totalCount
      nodes {
        frontmatter {
          slug
          date(formatString: "YYYY.MM.DD")
          title
          description
          tags
          category
          thumbnail
        }
      }
    }
  }
`;
