# gomsemarie.github.io

프론트엔드 엔지니어 gomsemarie의 기술 블로그. Astro 기반 정적 사이트로, `develop` 브랜치에 푸시하면 GitHub Actions가 빌드해 `main` 브랜치(GitHub Pages)로 배포합니다.

## 개발

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # dist/ 생성 + Pagefind 검색 인덱스
pnpm preview    # 빌드 결과 미리보기 (검색은 빌드 후에만 동작)
pnpm test       # Vitest
pnpm check      # 타입 검사
```

## 글 쓰기

`src/content/posts/<카테고리>/<파일명>.md`에 마크다운 파일을 추가합니다. 이미지는 같은 폴더의 `images/`에 두고 상대 경로로 참조하세요.

```yaml
---
title: "글 제목"
description: "목록과 검색 결과에 보일 요약"
date: 2026-10-15
category: "Tech/React"        # 최상위/하위. 최상위 라벨은 src/config/categories.ts
tags: ["react", "hooks"]
series: "시리즈 이름"          # 선택
seriesOrder: 1                # 선택
updated: 2026-10-20           # 선택
draft: true                   # 선택 — 프로덕션 빌드에서 제외
slug: "custom-slug"           # 선택 — 없으면 파일명
---
```

### 커스텀 문법

| 작성 | 결과 |
|---|---|
| `> [!NOTE]` `[!TIP]` `[!IMPORTANT]` `[!WARNING]` `[!CAUTION]` | 콜아웃 박스 (마커 뒤에 쓴 텍스트는 제목) |
| ```` ```ts title="file.ts" {2-4} ```` | 파일명 표시 + 라인 하이라이트 + 복사 버튼 |
| `![대체텍스트](./images/a.png "캡션")` | 캡션 달린 이미지, 클릭 시 확대 |

## 설정

- 사이트 정보·Giscus: `src/config/site.ts` — [giscus.app](https://giscus.app)에서 저장소 Discussions를 연결한 뒤 `repoId`, `categoryId`를 채우면 댓글이 켜집니다.
- 디자인 토큰: `src/styles/global.css`, 본문 스타일: `src/styles/prose.css`
- 설계 문서: `docs/superpowers/specs/2026-10-15-astro-blog-rebuild-design.md`
