import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";

/** 아이콘은 CSS(dark 클래스)로 전환해 SSR·하이드레이션 불일치를 피한다. */
export default function ThemeToggle() {
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="테마 전환"
      title="테마 전환"
      className="grid size-10 place-items-center rounded-lg text-foreground hover:bg-muted-strong"
    >
      <Moon className="size-[18px] dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-[18px] dark:block" aria-hidden="true" />
    </button>
  );
}
