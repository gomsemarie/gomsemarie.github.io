import { useEffect, useState } from "react";
import { navigate } from "astro:transitions/client";
import { Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
}

interface Pagefind {
  options?: (o: Record<string, unknown>) => Promise<void>;
  init?: () => void;
  preload: (q: string) => Promise<void>;
  debouncedSearch: (q: string) => Promise<{ results: { data: () => Promise<PagefindResult> }[] } | null>;
}

let pagefindPromise: Promise<Pagefind | null> | undefined;

/** 빌드 결과물의 /pagefind/pagefind.js를 동적으로 불러온다. 개발 서버에서 인덱스가 없으면 null. */
function loadPagefind() {
  pagefindPromise ??= import(/* @vite-ignore */ `${"/pagefind/pagefind.js"}`)
    .then(async (pf: Pagefind) => {
      await pf.options?.({ excerptLength: 22 });
      pf.init?.();
      return pf;
    })
    .catch(() => null);
  return pagefindPromise;
}

interface Props {
  tags: { tag: string; slug: string; count: number }[];
}

type Status = "idle" | "loading" | "ready" | "unavailable";

export default function SearchPalette({ tags }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStatus((s) => (s === "idle" ? "loading" : s));
    loadPagefind().then((pf) => setStatus(pf ? "ready" : "unavailable"));
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q || status !== "ready") {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    loadPagefind().then(async (pf) => {
      // 입력하는 동안 해당 단어의 인덱스 조각을 미리 받아 둔다
      pf?.preload(q);
      const search = await pf?.debouncedSearch(q);
      if (!search || cancelled) return;
      const data = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
      if (cancelled) return;
      setResults(data);
      setSearching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, status]);

  const q = query.trim().toLowerCase();
  const tagQuery = q.replace(/\s+/g, "-");
  const matchedTags = q ? tags.filter((t) => t.tag.includes(tagQuery)).slice(0, 5) : [];

  // 검색 버튼에 마우스를 올리거나 포커스하면 인덱스를 미리 불러온다
  const warmUp = () => void loadPagefind();

  const go = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={warmUp}
        onFocus={warmUp}
        className="hidden h-10 min-w-[190px] items-center justify-between gap-3 rounded-full border-[1.5px] border-line bg-surface pl-4 pr-2 text-sm text-ink-muted hover:bg-primary-soft hover:text-primary-ink md:flex"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />글 검색
        </span>
        <kbd className="rounded-full bg-sunken px-2 py-0.5 font-mono text-[11px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={warmUp}
        onFocus={warmUp}
        aria-label="글 검색"
        className="grid size-10 place-items-center rounded-full text-ink hover:bg-primary-soft md:hidden"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <DialogContent aria-describedby="search-desc">
          <DialogTitle className="sr-only">글 검색</DialogTitle>
          <DialogDescription id="search-desc" className="sr-only">
            제목과 본문에서 검색합니다. 위아래 화살표로 이동하고 Enter로 엽니다.
          </DialogDescription>
          <Command shouldFilter={false} label="글 검색">
            <CommandInput value={query} onValueChange={setQuery} placeholder="제목, 내용, 태그로 검색" autoFocus />
            <CommandList>
              {status === "unavailable" && (
                <p className="px-3 py-10 text-center text-sm text-ink-muted">
                  검색 인덱스가 없어요. <code className="font-mono">pnpm build</code> 후 미리보기에서 사용할 수 있습니다.
                </p>
              )}
              {(status === "loading" || searching) && q && results.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-ink-muted">검색 중…</p>
              )}
              {status === "ready" && !searching && q && results.length === 0 && matchedTags.length === 0 && (
                <CommandEmpty>“{query}”에 대한 결과가 없어요.</CommandEmpty>
              )}
              {!q && status !== "unavailable" && (
                <p className="px-3 py-10 text-center text-sm text-ink-muted">검색어를 입력하세요.</p>
              )}
              {results.length > 0 && (
                <CommandGroup heading={`글 · ${results.length}`}>
                  {results.map((r) => (
                    <CommandItem key={r.url} value={r.url} onSelect={() => go(r.url)}>
                      <span className="font-display text-[16px]">{r.meta.title}</span>
                      <span
                        className="text-[13px] leading-relaxed text-ink-muted [&_mark]:rounded-full [&_mark]:bg-primary [&_mark]:px-1 [&_mark]:text-on-primary"
                        dangerouslySetInnerHTML={{ __html: r.excerpt }}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {matchedTags.length > 0 && (
                <CommandGroup heading={`태그 · ${matchedTags.length}`}>
                  {matchedTags.map((t) => (
                    <CommandItem key={t.slug} value={`tag-${t.slug}`} onSelect={() => go(`/tags/${t.slug}/`)} className="flex-row">
                      <span className="pd-tag pd-tag--primary">
                        #{t.tag} <span className="text-ink-muted">{t.count}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <div className="flex gap-5 border-t-[1.5px] border-line px-5 py-3 text-xs text-ink-muted">
            <span><kbd className="font-mono">↑↓</kbd> 이동</span>
            <span><kbd className="font-mono">↵</kbd> 열기</span>
            <span><kbd className="font-mono">esc</kbd> 닫기</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
