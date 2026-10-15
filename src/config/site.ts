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
 * 방문자 분석 (GoatCounter). https://www.goatcounter.com 에서 만든 사이트 코드를 넣으면 켜진다.
 * 예: 코드가 "gomsemarie"면 https://gomsemarie.goatcounter.com 대시보드에서 통계를 본다.
 */
export const ANALYTICS = {
  goatcounter: "gomsemarie",
} as const;

/**
 * Giscus 설정 — https://giscus.app 에서 저장소를 선택하면 repoId / categoryId를 확인할 수 있다.
 * 값이 비어 있으면 댓글 영역 대신 안내 문구를 보여준다.
 */
export const GISCUS = {
  repo: "gomsemarie/gomsemarie.github.io",
  repoId: "R_kgDOMEEz6Q",
  category: "Comments",
  categoryId: "DIC_kwDOMEEz6c4DIf6n",
} as const;
