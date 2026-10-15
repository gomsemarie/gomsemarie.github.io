import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkCallouts } from "./remark-callouts";
import { rehypeFigure } from "./rehype-figure";

const render = (md: string) =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkCallouts)
      .use(remarkRehype)
      .use(rehypeFigure)
      .use(rehypeStringify)
      .processSync(md),
  );

describe("remarkCallouts", () => {
  it("[!NOTE]를 기본 라벨이 붙은 aside로 바꾼다", () => {
    const html = render("> [!NOTE]\n> 본문입니다.");
    expect(html).toContain('<aside class="callout" data-kind="note">');
    expect(html).toContain('<p class="callout-title">참고</p>');
    expect(html).toContain("<p>본문입니다.</p>");
    expect(html).not.toContain("[!NOTE]");
  });

  it("마커 뒤 텍스트를 제목으로 쓰고 인라인 요소를 보존한다", () => {
    const html = render("> [!TIP] 제목입니다\n> `code` 설명");
    expect(html).toContain('<p class="callout-title">제목입니다</p>');
    expect(html).toContain("<code>code</code> 설명");
  });

  it("일반 인용문은 그대로 둔다", () => {
    expect(render("> 그냥 인용")).toContain("<blockquote>");
  });
});

describe("rehypeFigure", () => {
  it("이미지 단독 문단을 figure + figcaption(title 우선)으로 감싼다", () => {
    const html = render('![대체 텍스트](a.png "캡션")');
    expect(html).toBe(
      '<figure class="md-figure"><img src="a.png" alt="대체 텍스트"><figcaption>캡션</figcaption></figure>',
    );
  });

  it("title이 없으면 alt를 캡션으로, 둘 다 없으면 캡션 없이 감싼다", () => {
    expect(render("![alt만](a.png)")).toContain("<figcaption>alt만</figcaption>");
    expect(render("![](a.png)")).toBe('<figure class="md-figure"><img src="a.png" alt=""></figure>');
  });

  it("텍스트와 섞인 이미지는 건드리지 않는다", () => {
    expect(render("글자 ![x](a.png)")).toContain("<p>");
  });
});
