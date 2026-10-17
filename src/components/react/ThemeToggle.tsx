import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";

/** 라이트·다크 전환. 아이콘은 CSS(dark 클래스)로 바꿔 SSR·하이드레이션 불일치를 피한다. */
export default function ThemeToggle() {
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="라이트·다크 전환"
      title="라이트·다크 전환"
      className="grid size-10 place-items-center rounded-full text-ink hover:bg-primary-soft"
    >
      <Moon className="size-[18px] dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-[18px] dark:block" aria-hidden="true" />
    </button>
  );
}
