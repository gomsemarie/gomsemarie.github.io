import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

/** 데스크톱 우측 목차. 스크롤 위치에 따라 현재 섹션을 강조한다. */
export default function TocSpy({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.slug);

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = els[0]?.id;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings]);

  return (
    <ol className="grid gap-0.5 text-[13px] leading-5">
      {headings.map((h) => (
        <li key={h.slug} className={cn(h.depth === 3 && "pl-3")}>
          <a
            href={`#${h.slug}`}
            aria-current={active === h.slug ? "location" : undefined}
            className={cn(
              "block rounded-full px-3.5 py-[7px]",
              active === h.slug ? "bg-primary-soft font-semibold text-primary-ink" : "text-ink-muted hover:bg-sunken hover:text-ink",
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
