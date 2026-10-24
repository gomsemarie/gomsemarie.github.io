---
title: "Electron IDE를 만들며 고친 작은 문제 다섯 개"
description: "자기가 저장한 파일에 반응하는 watcher, DOM 측정이 흔들리는 말줄임 감지, node-pty 우회 스크립트, 섞여 있던 아이콘 라이브러리, DPI가 다른 모니터에서 바뀌는 창 크기를 각각 어떻게 고쳤는지 문제, 원인, 해결 순서로 적었다."
date: 2026-06-16
category: "Tech/Electron"
tags: ["electron", "file-watcher", "node-pty", "canvas", "react"]
series: "Electron IDE 개발기"
seriesOrder: 5
---

큰 기능을 만드는 중간중간 작은 문제가 계속 나왔다. 하나씩은 글 한 편이 되기엔 짧지만, 그냥 넘기면 다음에 또 만날 것 같은 것들이다. 그중 다섯 개를 모았다. 각각 문제, 원인, 해결 순서로 적는다.

## 1. 내가 쓴 파일 때문에 화면이 다시 그려진다

### 문제

IDE는 프로젝트 폴더를 감시한다. 외부 편집기에서 파일을 고치면 IDE 화면도 따라 바뀌어야 해서다. 감시에는 `@parcel/watcher`를 쓴다.

그런데 IDE가 직접 저장한 파일도 이벤트로 돌아왔다. UI 빌더 패널에서 저장하면 watcher가 파일이 바뀌었다고 알리고, 패널은 파일을 다시 읽어 새 객체로 다시 렌더링했다. 저장할 때마다 방금 쓴 내용을 다시 읽어 오고 있었다.

처음에는 tracker를 하나 두었다. 쓰기 직전에 경로를 등록하고, 그 경로로 다음 이벤트가 오면 한 번 무시한다. 이것을 count 모드라고 불렀다.

### 원인

count 모드를 넣어도 리렌더링이 남았다. 저장은 기본적으로 atomic write라서, 임시 파일에 먼저 쓰고 `rename`으로 원래 파일을 바꾼다. 이때 OS와 파일 시스템에 따라 같은 경로로 이벤트가 여러 번 온다. macOS FSEvents는 update와 create를 연달아 보냈고, 첫 번째만 무시되고 두 번째는 그대로 통과했다.

몇 번 올지 미리 알 수 없으니 "다음 N건 무시"로는 맞출 수가 없었다.

### 해결

모드를 하나 더 만들었다. window 모드는 등록한 뒤 정해진 시간 동안 그 경로의 이벤트를 모두 무시한다. 일반 write는 이벤트가 한 번 오니 count 모드를 쓰고, atomic write에는 window 모드로 500ms를 준다.

```ts title="self-write-filter.ts"
type Entry =
  | { mode: 'count'; left: number; expiresAt: number }
  | { mode: 'window'; expiresAt: number };

export class SelfWriteFilter {
  private entries = new Map<string, Entry>();

  constructor(private ttlMs = 1500) {}

  mark(path: string, windowMs?: number) {
    const now = Date.now();
    if (windowMs && windowMs > 0) {
      this.entries.set(path, { mode: 'window', expiresAt: now + windowMs });
      return;
    }
    const prev = this.entries.get(path);
    if (prev?.mode === 'count' && prev.expiresAt > now) {
      prev.left += 1;
      prev.expiresAt = now + this.ttlMs;
      return;
    }
    this.entries.set(path, { mode: 'count', left: 1, expiresAt: now + this.ttlMs });
  }

  shouldSkip(path: string): boolean {
    const e = this.entries.get(path);
    if (!e) return false;
    if (e.expiresAt < Date.now()) {
      this.entries.delete(path);
      return false;
    }
    if (e.mode === 'window') return true; // 시간 안의 이벤트는 모두 버린다
    e.left -= 1;
    if (e.left <= 0) this.entries.delete(path);
    return true;
  }
}
```

window를 길게 잡으면 그사이 외부 편집기에서 바꾼 내용까지 놓치기 때문에 짧게 잡았다. count 모드 항목에도 1.5초 TTL을 두었다. 쓰기만 하고 이벤트가 끝내 오지 않으면 항목이 계속 남기 때문이다. 오래 켜 두는 앱이라 30초마다 만료된 항목을 지우는 타이머도 붙였고, 앱 종료를 막지 않도록 `unref()`를 걸었다.

> [!NOTE]
> 경로는 `path.resolve`로 정규화한 뒤 키로 쓴다. 같은 파일을 상대 경로와 절대 경로로 부르면 다른 항목이 되기 때문이다.

## 2. 말줄임이 됐는지 알아내기

### 문제

파일 탭이나 트리 라벨은 길면 `...`으로 자른다. 잘린 라벨에만 hover 툴팁을 띄우고 싶었다. 짧은 라벨에도 툴팁이 뜨면 거슬린다.

처음에는 흔히 쓰는 대로 `scrollWidth > clientWidth`로 판단했는데 예외가 계속 나왔다. 웹 폰트가 늦게 로드되면 대체 폰트 기준으로 잰 값이 남았다. 도킹 패널을 접었다 펴거나 React strict mode가 두 번 mount하면 숨은 상태에서 잰 0이 앞서 잰 정확한 값을 덮었다. 그때마다 `requestAnimationFrame`, `document.fonts.ready` 구독, `IntersectionObserver`를 하나씩 덧댔고, 고칠수록 코드가 지저분해졌다.

### 원인

DOM에서 읽은 값은 레이아웃이 끝났을 때만 믿을 수 있는데, 그 시점을 컴포넌트가 알기 어렵다. 폰트가 바뀌어도 요소 크기는 그대로일 수 있어서 `ResizeObserver`도 놓친다.

### 해결

글자 너비 측정을 canvas로 옮겼다. `@chenglou/pretext`는 canvas 2D로 텍스트를 재고 줄바꿈을 계산한다. `prepare(text, font)`를 한 번 하고 `layout(prepared, width, lineHeight)`로 줄 수를 얻는다. 한 줄 너비에 다 들어가지 않으면 줄 수가 1보다 커지고, 그러면 잘렸다고 본다.

```tsx title="use-is-truncated.ts"
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { prepare, layout } from '@chenglou/pretext';

function fontOf(el: HTMLElement) {
  const s = getComputedStyle(el);
  const size = parseFloat(s.fontSize) || 14;
  const lh = s.lineHeight.endsWith('px') ? parseFloat(s.lineHeight) : size * 1.2;
  return { font: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`, lineHeight: lh };
}

export function useIsTruncated(ref: RefObject<HTMLElement>, text: string) {
  const [font, setFont] = useState<ReturnType<typeof fontOf> | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (ref.current) setFont(fontOf(ref.current));
  }, [text]);

  const prepared = useMemo(() => (font ? prepare(text, font.font) : null), [text, font]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !prepared || !font) return;
    const check = () => {
      const width = el.clientWidth;
      if (width === 0) return; // 숨은 상태에서 잰 값은 버린다
      const next = layout(prepared, width, font.lineHeight).lineCount > 1;
      setTruncated((prev) => (prev === next ? prev : next));
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(check));
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, [prepared, font]);

  return truncated;
}
```

폰트 문자열은 `getComputedStyle`에서 꺼내므로 className마다 폰트가 달라도 따로 설정할 필요가 없다. `scrollWidth`를 읽지 않으니 측정 때문에 reflow가 생기지도 않는다. `document.fonts.ready` 구독은 지웠다.

DOM 생명주기 문제가 전부 사라지지는 않았다. 너비는 여전히 `clientWidth`에서 읽기 때문에, 숨은 상태면 건너뛰는 처리와 `IntersectionObserver`로 다시 보일 때 재측정하는 처리는 남겼다. 바뀐 것은 글자 너비를 더 이상 DOM에서 재지 않는다는 부분이다.

## 3. node-pty 우회 스크립트를 지웠다

### 문제

IDE 안의 터미널은 `node-pty`로 띄운다. native 모듈이라 Electron의 Node ABI에 맞는 binary가 있어야 한다. 그런데 본가 `node-pty` 1.x는 Electron ABI별 prebuilt를 주지 않았다. 그래서 `@electron/rebuild`로 다시 빌드하고, 만들어진 binary를 손으로 옮기는 스크립트를 두고, 루트와 IDE 패키지에 `postinstall`을 걸어 두었다. 다른 사람이 저장소를 받았을 때 이 체인이 한 군데만 어긋나도 터미널이 뜨지 않았다.

### 원인

코드에는 문제가 없었다. 필요한 binary가 npm 패키지에 들어 있지 않은 게 문제였다.

### 해결

같은 API를 유지하면서 Electron ABI별 prebuilt binary를 npm에 올려 주는 포크, `@homebridge/node-pty-prebuilt-multiarch`로 바꿨다. 코드 변경은 import 한 줄과 Vite 설정의 external 이름 정도였다.

```ts title="pty-service.ts"
// before: import * as pty from 'node-pty';
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

export function spawnShell(shell: string, cwd: string) {
  return pty.spawn(shell, [], { name: 'xterm-256color', cols: 80, rows: 24, cwd });
}
```

지운 것은 많았다. binary 복사 스크립트 133줄과 루트 `postinstall` 스크립트 42줄을 삭제했고, `@electron/rebuild`와 `node-pty` 의존성도 뺐다. lock 파일까지 합쳐 이 커밋에서 328줄이 빠지고 28줄이 늘었다. 이제는 `git pull` 후 `yarn install`만 하면 터미널이 뜬다.

> [!TIP]
> native 모듈 때문에 우회 스크립트가 쌓이고 있다면, 먼저 prebuilt를 주는 포크나 대체 패키지가 있는지 찾아보는 게 좋다. 이번에는 패키지 이름 하나를 바꾸는 것으로 해결됐다.

## 4. 아이콘 라이브러리를 하나로 맞췄다

### 문제

위젯 카탈로그와 일부 패널은 Phosphor 아이콘을, 나머지는 lucide를 쓰고 있었다. 같은 화면에 두 라이브러리의 아이콘이 섞이면 선 굵기와 모서리 처리가 달라 눈에 띈다.

### 원인

shadcn 기반 컴포넌트를 붙일 때 lucide가 같이 들어왔고, 그 뒤에 새로 만든 위젯과 패널은 Phosphor를 썼다. 어느 한쪽으로 정리하지 않은 채 둘 다 계속 쓰였다.

### 해결

73개 파일에서 lucide import를 Phosphor로 한 번에 바꿨다. 대부분은 이름만 바꾸면 됐다. `Chevron*`은 `Caret*Icon`, `Search`는 `MagnifyingGlassIcon`, `Settings`는 `GearIcon`, `Save`는 `FloppyDiskIcon` 같은 식이다. `LucideIcon` 타입은 Phosphor의 `Icon` 타입을 별칭으로 가져와 바꿨다. 변수 이름과 충돌하지 않게 하려고 그렇게 했다.

정확한 짝이 없는 아이콘은 커밋 메시지에 따로 적었다.

- `FolderSearch` → `FolderSimpleIcon`. 검색이라는 뜻이 빠진다.
- `CaseSensitive`, `WholeWord` → 둘 다 `TextAaIcon`. 서로 구분이 안 된다.
- `Grid3x3` → `GridFourIcon`. 3×3이 4×4가 된다.

검증은 코드 전체에서 `lucide-react` 검색 결과가 0인지 확인하고 빌드를 돌리는 것으로 했다. 쓰지 않게 된 devDependency는 이 커밋에서 건드리지 않았다. 한 커밋에 정리까지 섞으면 되돌릴 때 범위가 커진다.

## 5. 다른 모니터로 옮기면 창 크기가 바뀐다

### 문제

IDE는 처음에 작은 프로젝트 선택 창으로 뜨고, 프로젝트를 고르면 큰 에디터 창으로 바뀐다. 이때 같은 창의 크기를 `setBounds`로 바꾸고 URL만 다시 불렀다. 그런데 이렇게 크기를 바꾼 창을 배율(DPI)이 다른 모니터로 끌어가면 창 크기가 저절로 변했다.

### 원인

배율이 다른 모니터로 넘어가면 Electron이 새 배율에 맞춰 창 크기를 다시 계산하는데, 생성 뒤에 `setBounds`로 크기를 바꾼 창에서 이 계산이 어긋났다. 정확한 내부 원인까지는 확인하지 못했다. 그래서 원인을 고치는 대신 생성 뒤에 크기를 바꾸는 일 자체를 줄이기로 했다.

### 해결

화면마다 창 크기와 경로를 묶은 표를 만들었다. 화면을 바꿀 때는 지금 창을 닫고, 목표 크기로 새 `BrowserWindow`를 만든 뒤 해당 경로를 불러온다.

```ts title="switch-screen.ts"
import { BrowserWindow } from 'electron';

type ScreenInfo = { width: number; height: number; route: string };

export const SCREENS = {
  launcher: { width: 800, height: 600, route: '/' },
  editor: { width: 1600, height: 1000, route: '/code-editor' },
} satisfies Record<string, ScreenInfo>;

export function switchScreen(current: BrowserWindow, next: ScreenInfo, baseUrl: string) {
  current.close();
  const win = new BrowserWindow({ width: next.width, height: next.height, center: true });
  win.loadURL(`${baseUrl}/#${next.route}`);
  return win;
}
```

창을 새로 만들면 렌더러 상태가 날아가지만, 화면이 바뀌면 어차피 다른 페이지를 처음부터 그리기 때문에 이 경우에는 상관없었다. 같은 커밋에서 1,400줄이 넘던 `main.ts`를 IPC handler, 유틸, 화면 목록으로 나누는 정리도 했다.

> [!WARNING]
> 상태를 유지해야 하는 창에는 이 방법이 맞지 않는다. 그런 경우에는 창 생성 옵션의 크기와 실제 크기가 따로 놀지 않는지부터 확인해야 한다.

## 정리

- 자기가 쓴 파일의 watcher 이벤트는 횟수로 막지 못할 때가 있다. atomic write처럼 이벤트 수가 OS마다 다르면 짧은 시간 window로 막았다.
- 말줄임 판단에 쓰는 글자 너비 측정을 DOM에서 canvas(`@chenglou/pretext`)로 옮겨 폰트 교체 대응 코드를 지웠다. 숨은 상태 처리는 여전히 필요하다.
- native 모듈 우회 스크립트는 prebuilt를 주는 패키지로 바꾸면서 지웠다. 설치는 다시 `yarn install` 하나로 끝난다.
- 아이콘을 일괄 교체할 때 짝이 애매한 것은 따로 적어 두고, 검색 결과 0과 빌드 통과로 확인했다.
- DPI가 다른 모니터에서 창 크기가 변하는 문제는 화면마다 창을 새로 만드는 방식으로 피했다.
