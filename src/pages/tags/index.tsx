import React from "react";
import { Link, graphql, PageProps } from "gatsby";
import _ from "lodash";
import { SEOComponent } from "@_components";
import { Badge } from "@_components/ui/badge";
import { cn } from "../../lib/utils";

type TagGroup = {
  fieldValue: string;
  totalCount: number;
};

type DataProps = {
  allMdx: {
    group: TagGroup[];
    totalCount: number;
  };
};

export default function TagsIndexPage({ data }: PageProps<DataProps>) {
  const tags = [...data.allMdx.group].sort((a, b) =>
    a.fieldValue.localeCompare(b.fieldValue)
  );

  return (
    <main className="w-full py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-maple text-4xl text-foreground">태그</h1>
          <p className="font-sans text-sm text-muted-foreground mt-2">
            {tags.length}개의 태그 · {data.allMdx.totalCount}개의 포스트
          </p>
        </div>

        {/* Tags grid */}
        <div className="flex flex-wrap gap-3">
          {tags.map(({ fieldValue, totalCount }) => (
            <Link
              key={fieldValue}
              to={`/tags/${_.kebabCase(fieldValue)}/`}
              className="no-underline group"
            >
              <div
                className={cn(
                  "inline-flex items-center gap-2",
                  "border border-border rounded-lg",
                  "px-4 py-2 bg-background",
                  "hover:bg-secondary hover:border-primary/30 transition-colors",
                  "shadow-sm hover:shadow"
                )}
              >
                <span className="font-sans text-sm text-foreground group-hover:text-primary transition-colors">
                  # {fieldValue}
                </span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px] font-sans text-muted-foreground">
                  {totalCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export const Head = () => <SEOComponent title="태그" />;

export const query = graphql`
  {
    allMdx(limit: 2000) {
      totalCount
      group(field: { frontmatter: { tags: SELECT } }) {
        fieldValue
        totalCount
      }
    }
  }
`;
