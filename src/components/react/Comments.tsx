import Giscus from "@giscus/react";
import { useThemeStore } from "@/stores/theme";
import { GISCUS } from "@/config/site";

/** Giscus 댓글. 사이트 테마를 구독해 라이트/다크를 따라간다. 설정값이 없으면 페이지에서 렌더하지 않는다. */
export default function Comments() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <Giscus
      repo={GISCUS.repo}
      repoId={GISCUS.repoId}
      category={GISCUS.category}
      categoryId={GISCUS.categoryId}
      mapping="pathname"
      strict="1"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme === "dark" ? "noborder_dark" : "noborder_light"}
      lang="ko"
      loading="lazy"
    />
  );
}
