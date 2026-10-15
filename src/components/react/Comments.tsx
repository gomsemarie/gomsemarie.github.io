import Giscus from "@giscus/react";
import { useThemeStore } from "@/stores/theme";
import { GISCUS } from "@/config/site";

/** Giscus 댓글. 사이트 테마를 구독해 라이트/다크를 따라간다. */
export default function Comments() {
  const theme = useThemeStore((s) => s.theme);

  if (!GISCUS.repoId || !GISCUS.categoryId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-7 text-sm leading-relaxed text-muted-foreground">
        댓글은 Giscus 설정 후 표시됩니다. <code className="font-mono">src/config/site.ts</code>의 repoId·categoryId를 채워주세요.
      </div>
    );
  }

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
