import { Link, PageProps, graphql } from "gatsby";
import React, { useEffect, useId } from "react";
import { ContentsArticle, PageMain, TagSpan } from "./style";
import { SEOComponent, Toc, TocItem } from "@_components";
import { isBrowser } from "@_utils";
import DesignSystem from "@_components/design-system";
import { MDXProvider } from "@mdx-js/react";
import _ from "lodash";
import moment from "moment";
import { useScreen } from "usehooks-ts";
import { breakpoints } from "@_styles";

export default function PostTemplate({
  pageContext,
  data,
  children,
}: PageProps<Queries.PostDetailQuery, Queries.PostDetailQuery>) {
  const id = useId();
  // const { width, height } = useScreen({
  //   debounceDelay: 100,
  // });

  const toc = data.mdx?.tableOfContents as TocItem | undefined;
  const anchorHolder = isBrowser()
    ? document.getElementsByClassName("anchor-header")
    : undefined;

  const shortcodes = { Tip: DesignSystem.Tip };

  const info = data.mdx?.frontmatter;
  const tags = info?.tags ?? [];
  const title = info?.title ?? "";
  const desc = info?.description ?? "";
  const date = moment(info?.date, "MMMM DD, YYYY");

  return (
    <MDXProvider
      disableParentContext
      components={{
        ...shortcodes,
        h1: DesignSystem.H1,
        h2: DesignSystem.H2,
        h3: DesignSystem.H3,
        h4: DesignSystem.H4,
        em: DesignSystem.Em,
        hr: DesignSystem.Hr,
      }}
    >
      <PageMain data-page="post">
        <ContentsArticle>
          <section className="title-area">
            <div className="tag-box">
              {tags.map((tag, index) => (
                <Tag key={`${id}-tag-${index}`} name={tag} />
              ))}
            </div>
            <div className="title-box">
              <p>{title}</p>
            </div>
            <div className="desc-box">
              <p>{desc}</p>
            </div>
            <div className="date-box">
              <p>{date.format("yyyy.MM.DD")}</p>
            </div>
          </section>
          <section className="contents-area">{children}</section>
          <section className="toc-area">
            <div className="toc-box">
              <Toc toc={toc} anchorHolder={anchorHolder} />
            </div>
            <div className="toc-icon-box">
              <Toc.Icon toc={toc} anchorHolder={anchorHolder} />
            </div>
          </section>
        </ContentsArticle>
      </PageMain>
    </MDXProvider>
  );
}

function Tag(props: { name: string | null }) {
  const name = props.name === null ? "" : props.name;

  return (
    <TagSpan>
      <Link to={`/tags/${_.kebabCase(name)}`}>{name}</Link>
    </TagSpan>
  );
}

export function Head({ data }: PageProps<Queries.PostDetailQuery>) {
  return (
    <SEOComponent
      title={data.mdx?.frontmatter?.title ?? ""}
      description={data.mdx?.frontmatter?.description ?? ""}
    />
  );
}

export const query = graphql`
  query PostDetail($slug: String) {
    mdx(frontmatter: { slug: { eq: $slug } }) {
      frontmatter {
        slug
        date(formatString: "MMMM DD, YYYY")
        title
        description
        tags
        category
      }
      excerpt(pruneLength: 250)
      tableOfContents
    }
  }
`;
