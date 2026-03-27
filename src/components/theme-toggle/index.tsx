import React from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "../../contexts/theme-context";
import { cn } from "../../lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-full",
        "text-foreground/60 hover:text-foreground hover:bg-accent",
        "transition-all duration-200"
      )}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <span className="relative flex items-center justify-center w-5 h-5">
        <Icon
          icon="lucide:sun"
          width={18}
          className={cn(
            "absolute transition-all duration-300",
            isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-0"
          )}
        />
        <Icon
          icon="lucide:moon"
          width={18}
          className={cn(
            "absolute transition-all duration-300",
            isDark
              ? "opacity-0 -rotate-90 scale-0"
              : "opacity-100 rotate-0 scale-100"
          )}
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
