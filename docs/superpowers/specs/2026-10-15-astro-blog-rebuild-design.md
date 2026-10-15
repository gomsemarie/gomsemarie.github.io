# gomsemarie 블로그 Astro 리빌드 — 설계 스펙

- 작성일: 2026-10-15
- 브랜치: `astro-rebuild` (기준: `develop`)
- 디자인 시안: https://claude.ai/artifact/31Rqce9sxzUuf6R4mzyhzi (홈, 글 상세, ⌘K 검색, 카테고리·태그·시리즈, 모바일 다크)

## 1. 목표와 범위

개발 기술 블로그 중심의 정적 사이트를 Gatsby에서 Astro로 완전히 새로 만든다. 기존 코드는 버리고, 기존 글 8편·이미지만 이관한다.

성공 기준
- `pnpm build`가 에러 없이 `dist/`를 만들고, GitHub Actions가 `develop` 푸시 시 `main` 브랜치로 배포한다.
- 글은 `.md` 파일로만 작성하며, 콜아웃·코드블록·이미지 캡션 등 커스텀 디자인이 빌드 시 적용된다.
- 시안의 미니멀 타이포 디자인(라이트/다크)이 데스크톱·모바일에서 재현된다.
- 페이지 기본 JS 0, 인터랙션이 필요한 부분만 React 아일랜드.

범위 밖: 다국어, 조회수/좋아요 등 서버 기능, 뉴스레터, CMS.

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Astro 7.x, `output: 'static'` | `site: https://gomsemarie.github.io`, base 없음 |
| UI 아일랜드 | `@astrojs/react` + React 19 + TypeScript strict | |
| 스타일 | Tailwind v4 (`@tailwindcss/vite`) + `@tailwindcss/typography` 미사용(본문 스타일 직접 작성) | 디자인 토큰은 CSS 변수 |
| 컴포넌트 | shadcn/ui (Dialog, Command) | 검색 팔레트에만 사용 |
| 상태 | Zustand | 테마 상태를 ThemeToggle·Giscus 아일랜드가 공유 |
| 데이터 패칭 | 사용 안 함 (TanStack Query 제외) | 런타임 API 호출 없음 |
| 마크다운 | `processor: unified()` (`@astrojs/markdown-remark`) | Sätteri 대신 플러그인 생태계 활용 |
| 코드블록 | `astro-expressive-code` | 제목·복사·라인 하이라이트·diff, 라이트/다크 테마 |
| 검색 | Pagefind (빌드 후 인덱싱) | ⌘K 팔레트에서 JS API 사용 |
| 댓글 | `@giscus/react` | `client:visible`, 테마 연동 |
| 피드/SEO | `@astrojs/rss`, `@astrojs/sitemap`, 글별 OG 이미지 자동 생성 | OG 폰트는 한글 TTF 포함 |
| 폰트 | Pretendard(dynamic subset), JetBrains Mono | 시안의 IBM Plex Sans KR은 대체용 |
| 테스트 | Vitest | 순수 함수(분류·시리즈·관련글·마크다운 플러그인) |
| 패키지 매니저 | pnpm 10 | |

## 3. 콘텐츠 모델

글 위치: `src/content/posts/<카테고리폴더>/<파일>.md` (이미지는 같은 폴더 `images/`에 두고 상대경로로 참조).

```yaml
---
title: "React 19 / 19.2 완전 정리"        # 필수
description: "요약 한두 문장"              # 필수
date: 2025-03-10                          # 필수
updated: 2025-03-14                       # 선택
category: "Tech/React"                    # 필수, "최상위/하위" 경로
tags: ["react", "hooks"]                  # 선택, 기본 []
series: "프론트엔드 개발자의 배포와 인프라"  # 선택
seriesOrder: 1                            # series가 있으면 권장
thumbnail: "./images/cover.png"           # 선택 (OG 대체)
draft: false                              # 선택, true면 프로덕션 빌드 제외
slug: "react-19"                          # 선택, 없으면 파일명
---
```

- 컬렉션 정의: `src/content.config.ts`, `glob({ pattern: '**/*.md', base: './src/content/posts' })` + Zod 스키마.
- 최상위 카테고리 메타: `src/config/categories.ts` — `{ Tech: { label: '개발', order: 1 }, Infra: { label: '인프라' }, DevOps, Tools: '도구', Trend: '트렌드' }`. 하위 카테고리는 라벨 그대로 표시.
- 기존 시안의 예시 시리즈 "프론트엔드 개발자의 배포와 인프라"(Vercel → Kubernetes)를 실제 frontmatter로 적용한다.

## 4. 마크다운 커스텀 렌더링 (.md → 커스텀 디자인)

`.md`에는 MDX `components` 매핑이 적용되지 않으므로, 빌드 시 AST 변환 + CSS로 디자인을 입힌다.

| 문법 | 결과 | 구현 |
|---|---|---|
| `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` | `<aside class="callout" data-kind>` + 아이콘 + 한글 라벨(참고/팁/중요/주의/위험) | 자체 remark 플러그인 `remark-callouts` |
| ```` ```ts title="a.ts" {2-4} ```` | 제목 바·복사 버튼·라인 하이라이트 | Expressive Code |
| `## 제목` | `id` + 호버 시 `#` 앵커 | `rehype-autolink-headings` (Astro heading id 플러그인 이후) |
| 이미지 단독 문단 `![alt](src "캡션")` | `<figure>` + `<figcaption>`(title, 없으면 alt) + 클릭 확대 | 자체 rehype 플러그인 `rehype-figure` + `medium-zoom` |
| 외부 링크 | `target="_blank" rel="noopener noreferrer"` | `rehype-external-links` |
| 읽기 시간 | frontmatter에 `minutesRead` 주입 | 자체 remark 플러그인 + `reading-time` |
| GFM 표·각주·체크리스트 | 기본 스타일 | unified 기본 GFM |

향후 인터랙티브 데모가 필요한 글만 `.mdx`를 허용할 수 있도록 `@astrojs/mdx`도 등록해 둔다(컬렉션 패턴 `**/*.{md,mdx}`).

## 5. 페이지와 라우트

| 경로 | 내용 |
|---|---|
| `/` | 히어로 + 최상위 카테고리 칩 + 연도별 글 목록 + 사이드바(시리즈, 자주 쓴 태그, RSS) |
| `/posts/[slug]/` | 글 상세: 경로, 제목, 메타(날짜·읽기 시간·수정일), 시리즈 박스, 본문, 태그, 이전/다음, Giscus, 관련 글 3개, 우측 목차(스크롤 스파이), 상단 읽기 진행바 |
| `/categories/[...path]/` | 최상위·하위 카테고리별 글 목록 (`/categories/tech/`, `/categories/tech/react/`) |
| `/tags/` | "카테고리와 태그" 아카이브: 카테고리 트리, 태그 전체, 시리즈 목록 |
| `/tags/[tag]/` | 태그별 글 목록 |
| `/series/` · `/series/[series]/` | 시리즈 목록 · 시리즈 상세(순서대로) |
| `/about/` | 소개 (GitHub 아바타 `https://github.com/gomsemarie.png`, 링크) |
| `/404` | 안내 + 홈 링크 |
| `/rss.xml` | 전체 글 피드 |
| `/og/[slug].png` | 글별 OG 이미지 (제목·카테고리·사이트명) |
| `sitemap-index.xml` | `@astrojs/sitemap` |

URL용 슬러그: 카테고리·시리즈·태그는 소문자 + 공백→`-`, 한글은 그대로(인코딩).

## 6. 컴포넌트 구조

```
src/
  config/        site.ts(사이트 메타·Giscus 설정), categories.ts
  lib/           posts.ts(조회·정렬·드래프트 필터), taxonomy.ts(카테고리 트리·태그 집계·시리즈), related.ts, slug.ts
  plugins/       remark-callouts.ts, remark-reading-time.ts, rehype-figure.ts
  layouts/       BaseLayout.astro(head·SEO·테마 스크립트), PostLayout.astro
  components/    Header.astro, Footer.astro, PostList.astro, PostItem.astro, CategoryChips.astro,
                 SeriesBox.astro, PrevNext.astro, RelatedPosts.astro, Toc.astro, TagList.astro
  components/react/  SearchPalette.tsx, ThemeToggle.tsx, TocSpy.tsx, Comments.tsx, ReadingProgress.tsx
  components/ui/     shadcn (dialog, command)
  stores/        theme.ts (Zustand)
  styles/        global.css(토큰·베이스), prose.css(본문)
```

- `lib/*`는 Astro에 의존하지 않는 순수 함수로 작성해 Vitest로 테스트한다.
- 테마: `<head>` 인라인 스크립트가 `localStorage.theme` 또는 `prefers-color-scheme`으로 `html.dark`를 첫 페인트 전에 설정. Zustand 스토어는 토글 시 클래스·localStorage를 갱신하고, Comments는 이를 구독해 Giscus 테마를 바꾼다.
- 검색: 헤더 검색 버튼과 ⌘K/Ctrl+K가 같은 `SearchPalette` 아일랜드를 연다. `/pagefind/pagefind.js`를 동적 import, 결과를 글 단위로 표시하고 하이라이트(`<mark>`) 발췌를 보여준다. 개발 서버에서 인덱스가 없으면 "빌드 후 사용 가능" 안내.
- 목차: 서버에서 `headings`(h2·h3)로 렌더, `TocSpy`가 IntersectionObserver로 현재 섹션을 강조. 모바일에서는 본문 상단 접이식 목차.

## 7. 디자인 토큰 (시안 기준)

| 토큰 | 라이트 | 다크 |
|---|---|---|
| background | `#FBFBFA` | `#0F0F11` |
| surface | `#FFFFFF` / muted `#F3F2EF` | `#18181B` / `#222226` |
| foreground | `#18181B` | `#EDEDEF` |
| muted-foreground | `#63636B` | `#9C9CA5` |
| border | `#E6E5E1` | `#27272A` |
| accent | `#A8336A` | `#F27BAE` |
| callout note | bg `#EEF2FB` / fg `#1E3A72` | `#172238` / `#C9D8F8` |
| callout warning | bg `#FBF1E4` / fg `#6B3D0B` | `#2E2213` / `#F4D6A8` |

타이포: 본문 17px / line-height 1.8, `word-break: keep-all`, `overflow-wrap: anywhere`; 제목 `letter-spacing: -0.02~-0.035em`, `text-wrap: balance`; 본문 폭 최대 720px; 컨테이너 1120px.

## 8. 배포

- `.github/workflows/deploy.yml`: `develop` 푸시 → pnpm install → `pnpm build`(Astro 빌드 + Pagefind 인덱싱) → `peaceiris/actions-gh-pages`로 `./dist`를 `main`에 게시. Node 22.
- Gatsby 관련 파일·의존성·폰트(MapleStory, Nanum)·`HOMEPAGE_SPEC.md`·`.env*`(Gatsby 전용) 삭제. 사이트 메타는 `src/config/site.ts`로 이동.

## 9. 에러·엣지 처리

- frontmatter 스키마 위반 시 빌드 실패(Zod) — 잘못된 글이 조용히 배포되지 않게.
- `draft: true`는 프로덕션 빌드에서 제외, 개발 서버에서는 "초안" 배지로 표시.
- Giscus `repoId`/`categoryId` 미설정 시 댓글 영역 대신 안내 문구를 렌더(빌드는 성공).
- 시리즈 순서 누락 시 날짜순 정렬.

## 10. 검증

- `pnpm test` (Vitest): taxonomy, related, slug, remark-callouts, rehype-figure.
- `pnpm astro check` 타입 검사 0 에러.
- `pnpm build` 성공 + `dist/pagefind/` 생성 확인.
- 프리뷰 서버에서 홈·글 상세·검색·다크 모드·모바일 폭을 브라우저로 확인.

## 11. 사용자 확인 필요 사항

- Giscus 사용을 위해 저장소 Discussions 활성화와 giscus.app 앱 설치가 필요하다(설정값은 `src/config/site.ts`).
