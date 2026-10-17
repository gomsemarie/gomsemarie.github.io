import { useEffect, useRef, useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import { PALETTES, useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";

/** 헤더의 색 테마 선택기. 버튼을 누르면 스와치 6개가 펼쳐진다. */
export default function PalettePicker() {
  const [open, setOpen] = useState(false);
  const palette = useThemeStore((s) => s.palette);
  const setPalette = useThemeStore((s) => s.setPalette);
  const ref = useRef<HTMLDivElement>(null);

  // 하이드레이션 뒤 실제 html 속성과 맞춘다
  useEffect(() => {
    const current = document.documentElement.dataset.palette;
    if (current && current !== palette) useThemeStore.setState({ palette: current as typeof palette });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const currentName = PALETTES.find((p) => p.id === palette)?.name;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="색 테마 고르기"
        title="색 테마 고르기"
        className="grid size-10 place-items-center rounded-full text-ink hover:bg-primary-soft"
      >
        <PaletteIcon className="size-[18px]" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-[var(--radius-md)] border-[1.5px] border-line bg-surface p-4 shadow-panel">
          <p className="font-display text-[15px] text-primary-ink">색 테마</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="색 테마">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                aria-pressed={palette === p.id}
                aria-label={p.name}
                title={p.name}
                style={{ background: p.swatch }}
                className={cn(
                  "size-7 rounded-full border-[3px] border-surface",
                  palette === p.id ? "shadow-[0_0_0_2px_var(--primary-ink)]" : "shadow-[0_0_0_1.5px_var(--line-strong)]",
                )}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-muted">{currentName}</p>
        </div>
      )}
    </div>
  );
}
