import * as React from "react";
import { graphql, PageProps } from "gatsby";
import { SEOComponent } from "@_components";
import { SplitHero } from "@_components/split-hero";
import { FeaturedPost } from "@_components/featured-post";
import { CategoryShowcase } from "@_components/category-showcase";
import { TagsCloud } from "@_components/tags-cloud";
import { RecentPosts } from "@_components/recent-posts";
import { PostNode } from "../types/homepage";

type TagGroup = {
  fieldValue: string;
  totalCount: number;
};

type DataProps = {
  allMdx: {
    nodes: ReadonlyArray<PostNode>;
    group: ReadonlyArray<TagGroup>;
  };
};

const IndexRoute = ({ data }: PageProps<DataProps>) => {
  const nodes = data.allMdx.nodes;
  const groups = data.allMdx.group;

  const featuredPost: PostNode | null = nodes[0] ?? null;
  const recentPosts = nodes.slice(0, 6);
  const tags = groups.map((g) => g.fieldValue);

  return (
    <main>
      <SplitHero />
      <FeaturedPost post={featuredPost} />
      {/* CategoryShowcase reads category config dynamically — no prop drilling needed */}
      <CategoryShowcase allPosts={nodes} />
      <TagsCloud tags={tags} />
      <RecentPosts posts={recentPosts} />
    </main>
  );
};

export default IndexRoute;

export const Head = () => <SEOComponent />;

export const query = graphql`
  {
    allMdx(sort: { frontmatter: { date: DESC } }) {
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
      group(field: { frontmatter: { tags: SELECT } }) {
        fieldValue
        totalCount
      }
    }
  }
`;
