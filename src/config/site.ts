export const SITE = {
  title: "gomsemarie",
  description: "프론트엔드 엔지니어 gomsemarie의 기술 블로그",
  author: "gomsemarie",
  url: "https://gomsemarie.github.io",
  github: "https://github.com/gomsemarie",
  repo: "https://github.com/gomsemarie/gomsemarie.github.io",
  locale: "ko-KR",
} as const;

/**
 * Giscus 설정 — https://giscus.app 에서 저장소를 선택하면 repoId / categoryId를 확인할 수 있다.
 * 값이 비어 있으면 댓글 영역 대신 안내 문구를 보여준다.
 */
export const GISCUS = {
  repo: "gomsemarie/gomsemarie.github.io",
  repoId: "",
  category: "Comments",
  categoryId: "",
} as const;
