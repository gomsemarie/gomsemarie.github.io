export type Page = {
  slug: string;
  title: string;
  author?: string;
  category?: string;
  date?: string;
};

export type MarkdownRemark<T> = {
  html: string;
  frontmatter: T;
};

export type MarkdownNodes<T> = {
  nodes: Array<MarkdownRemark<T>>;
};

export type Markdown<T> = {
  project: MarkdownRemark<T>;
  blogPost: MarkdownRemark<T>;
};

export type AllMarkdown<T> = {
  projects: MarkdownNodes<T>;
  blogPost: MarkdownNodes<T>;
};
