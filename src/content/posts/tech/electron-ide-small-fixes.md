---
title: "Electron IDE의 작은 문제 다섯 개"
description: "Electron IDE를 만들며 고친 작은 문제 다섯 개를 문제, 원인, 해결 순서로 정리했다. 파일 감시의 자기 이벤트, 말줄임 감지, node-pty 빌드, 아이콘 교체, DPI가 다른 모니터에서의 창 크기를 다룬다."
date: 2026-10-17
category: "Tech/Electron"
tags: ["electron", "file-watcher", "node-pty", "canvas", "react"]
series: "Electron IDE 개발기"
seriesOrder: 5
draft: true
---

큰 기능을 만들다 보면 중간에 작은 문제가 계속 나온다. 하나씩 보면 글 한 편이 되기엔 짧고, 그냥 넘기기엔 다음에 또 만날 것 같은 것들이다. 이번 글은 그런 것 다섯 개를 모았다. 순서는 문제, 원인, 해결이다.

1~3번은 AI 코딩 에이전트와 함께 작업했고, 4~5번은 직접 고쳤다.

## 1. 내가 쓴 파일 때문에 화면이 다시 그려진다

### 문제

IDE는 프로젝트 폴더를 감시한다. 외부 편집기에서 파일을 고치면 IDE 화면도 따라 바뀌어야 하기 때문이다. 감시에는 `@parcel/watcher`를 쓴다.

문제는 IDE가 직접 저장한 파일도 이벤트로 돌아온다는 점이다. UI 빌더 패널에서 저장하면 watcher가 "파일이 바뀌었다"고 알리고, 패널은 파일을 다시 읽고, 새 객체를 받아 다시 렌더링했다. 저장할 때마다 내가 방금 쓴 내용을 다시 읽어 오는 셈이다.

처음에는 tracker를 하나 두었다. 쓰기 직전에 경로를 등록하고, 그 경로로 다음 이벤트가 오면 한 번 무시한다. 이것을 count 모드라고 불렀다.

### 원인

count 모드로도 리렌더링이 남았다. 저장은 기본적으로 atomic write다. 임시 파일에 먼저 쓰고 `rename`으로 원래 파일을 바꾼다. 이때 OS와 파일 시스템에 따라 같은 경로로 이벤트가 여러 번 온다. macOS FSEvents는 update와 create를 연달아 보냈다. 첫 번째는 무시되고 두 번째가 그대로 통과했다.

몇 번 올지 미리 알 수 없으니 "다음 N건 무시"로는 맞출 수 없다.

### 해결

모드를 하나 더 만들었다. window 모드는 등록한 뒤 정해진 시간 동안 그 경로의 이벤트를 모두 무시한다. 일반 write는 이벤트가 한 번 오니 count 모드를 쓰고, atomic write는 window 모드로 500ms를 준다.

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

window를 너무 길게 잡으면 그사이 외부 편집기에서 바꾼 것도 놓친다. 그래서 짧게 잡았다. count 모드 항목에도 1.5초 TTL을 두었다. 쓰기만 하고 이벤트가 끝내 오지 않으면 항목이 남기 때문이다. 오래 켜 두는 앱이라 30초마다 만료된 항목을 지우는 타이머도 붙였다. 이 타이머는 `unref()`로 걸어 앱 종료를 막지 않게 했다.

> [!NOTE]
> 경로는 `path.resolve`로 정규화한 뒤 키로 쓴다. 같은 파일을 상대 경로와 절대 경로로 부르면 다른 항목이 되기 때문이다.

## 2. 말줄임이 됐는지 알아내기

### 문제

파일 탭이나 트리 라벨은 길면 `...`으로 자른다. 잘린 라벨에만 hover 툴팁을 띄우고 싶었다. 짧은 라벨에도 툴팁이 뜨면 거슬린다.

처음에는 표준 방식대로 `scrollWidth > clientWidth`로 판단했다. 그런데 예외가 계속 나왔다. 웹 폰트가 늦게 로드되면 대체 폰트 기준으로 잰 값이 남았다. 도킹 패널을 접었다 펴거나 React strict mode가 두 번 mount하면 숨은 상태에서 잰 0이 앞의 정확한 값을 덮었다. 그때마다 `requestAnimationFrame`, `document.fonts.ready` 구독, `IntersectionObserver`를 하나씩 덧댔다. 고칠수록 코드가 지저분해졌다.

### 원인

DOM에서 읽는 값은 레이아웃이 끝났을 때만 믿을 수 있다. 언제 끝났는지는 컴포넌트가 알기 어렵다. 폰트 교체는 요소 크기를 바꾸지 않을 수도 있어서 `ResizeObserver`도 놓친다.

### 해결

측정을 canvas로 옮겼다. `@chenglou/pretext`는 canvas 2D로 텍스트를 재고 줄바꿈을 계산한다. `prepare(text, font)`를 한 번 하고, `layout(prepared, width, lineHeight)`로 줄 수를 얻는다. 한 줄 너비 안에 다 들어가지 않으면 줄 수가 1보다 커진다. 그러면 잘렸다고 본다.

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

폰트 문자열은 `getComputedStyle`에서 꺼낸다. 그래서 className마다 폰트가 달라도 따로 설정할 필요가 없다. `scrollWidth`를 읽지 않으니 측정 때문에 reflow가 생기지도 않는다. `document.fonts.ready` 구독은 지웠다.

다만 DOM 생명주기 문제가 전부 사라지지는 않았다. 너비는 여전히 `clientWidth`에서 읽는다. 그래서 숨은 상태면 건너뛰기, `IntersectionObserver`로 다시 보일 때 재측정하기는 남겼다. 바뀐 것은 "글자 너비"를 더 이상 DOM에 묻지 않는다는 점이다.

## 3. node-pty 우회 스크립트를 지웠다

### 문제

IDE 안의 터미널은 `node-pty`로 띄운다. native 모듈이라 Electron의 Node ABI에 맞는 binary가 필요하다. 그런데 본가 `node-pty` 1.x는 Electron ABI별 prebuilt를 주지 않았다. 그래서 `@electron/rebuild`로 다시 빌드하고, 만들어진 binary를 손으로 옮기는 스크립트를 두고, 루트와 IDE 패키지에 `postinstall`을 걸었다. 다른 사람이 저장소를 받으면 이 체인이 한 군데만 어긋나도 터미널이 안 떴다.

### 원인

문제는 코드가 아니라 배포물이었다. 우리에게 필요한 binary가 npm 패키지에 들어 있지 않았다.

### 해결

같은 API를 유지하면서 Electron ABI별 prebuilt binary를 npm에 올려 주는 포크로 바꿨다. `@homebridge/node-pty-prebuilt-multiarch`다. 코드 변경은 import 한 줄과 Vite 설정의 external 이름 정도였다.

```ts title="pty-service.ts"
// before: import * as pty from 'node-pty';
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

export function spawnShell(shell: string, cwd: string) {
  return pty.spawn(shell, [], { name: 'xterm-256color', cols: 80, rows: 24, cwd });
}
```

대신 많이 지웠다. binary 복사 스크립트 133줄과 루트 `postinstall` 스크립트 42줄을 삭제했다. `@electron/rebuild`와 `node-pty` 의존성도 뺐다. lock 파일까지 합치면 이 커밋에서 328줄이 빠지고 28줄이 늘었다. 이제는 `git pull`하고 `yarn install`만 하면 터미널이 뜬다.

> [!TIP]
> native 모듈 때문에 우회 스크립트가 쌓이고 있다면 먼저 prebuilt를 주는 포크나 대체 패키지가 있는지 찾아본다. 고치는 데 하루가 걸리는 문제가 패키지 이름 하나로 끝나기도 한다.

## 4. 아이콘 라이브러리를 하나로 맞췄다

### 문제

위젯 카탈로그와 일부 패널은 Phosphor 아이콘을 쓰고 있었고, 나머지는 lucide였다. 같은 화면에 두 라이브러리의 아이콘이 섞이면 선 굵기와 모서리 처리가 달라 티가 난다.

### 원인

shadcn 기반 컴포넌트를 붙일 때 lucide가 함께 들어왔다. 그 뒤 새로 만든 위젯과 패널은 Phosphor를 썼다. 한쪽으로 정리하지 않은 채 둘 다 계속 쓰였다.

### 해결

73개 파일에서 lucide import를 Phosphor로 한 번에 바꿨다. 대부분은 이름만 바꾸면 됐다. `Chevron*`은 `Caret*Icon`, `Search`는 `MagnifyingGlassIcon`, `Settings`는 `GearIcon`, `Save`는 `FloppyDiskIcon` 같은 식이다. `LucideIcon` 타입은 Phosphor의 `Icon` 타입을 별칭으로 가져와서 바꿨다. 변수 이름과 충돌하지 않게 하기 위해서다.

딱 맞는 짝이 없는 것도 있었다. 그런 것은 커밋 메시지에 따로 적었다.

- `FolderSearch` → `FolderSimpleIcon`. 검색이라는 뜻이 빠진다.
- `CaseSensitive`, `WholeWord` → 둘 다 `TextAaIcon`. 서로 구분이 안 된다.
- `Grid3x3` → `GridFourIcon`. 3×3이 4×4가 된다.

검증은 단순하게 했다. 코드 전체에서 `lucide-react` 검색 결과가 0인지 확인하고 빌드를 돌렸다. 쓰지 않게 된 devDependency는 이 커밋에서 건드리지 않고 남겨 두었다. 한 커밋에 정리까지 섞으면 되돌릴 때 범위가 커진다.

## 5. 다른 모니터로 옮기면 창 크기가 바뀐다

### 문제

IDE는 처음에 작은 프로젝트 선택 창으로 뜨고, 프로젝트를 고르면 큰 에디터 창으로 바뀐다. 이때 같은 창의 크기를 `setBounds`로 바꾸고 URL만 다시 불렀다. 그런데 크기를 바꾼 창을 배율(DPI)이 다른 모니터로 끌어가면 창 크기가 저절로 변했다.

### 원인

배율이 다른 모니터로 넘어가면 Electron이 창 크기를 새 배율 기준으로 다시 계산한다. 생성 뒤에 `setBounds`로 크기를 바꾼 창에서 이 계산이 어긋났다. 정확한 내부 원인까지는 확인하지 못했다. 그래서 원인을 고치기보다 크기를 나중에 바꾸는 일 자체를 줄이는 쪽을 택했다.

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

창을 새로 만들면 렌더러 상태가 날아간다. 이 경우에는 상관없었다. 화면이 바뀌면 어차피 다른 페이지를 처음부터 그리기 때문이다. 같은 커밋에서 1,400줄이 넘던 `main.ts`를 IPC handler, 유틸, 화면 목록으로 나누는 정리도 했다.

> [!WARNING]
> 상태를 유지해야 하는 창이라면 이 방법은 맞지 않는다. 그런 경우에는 창 생성 옵션의 크기와 실제 크기가 따로 놀지 않는지 먼저 확인해야 한다.

## 정리

- 자기가 쓴 파일의 watcher 이벤트는 횟수로 막지 못할 때가 있다. atomic write처럼 이벤트 수가 OS마다 다르면 짧은 시간 window로 막는다.
- 말줄임 판단에 쓰던 글자 너비 측정을 DOM에서 canvas(`@chenglou/pretext`)로 옮겼다. 폰트 교체 대응 코드를 지울 수 있었다. 숨은 상태 처리는 여전히 필요하다.
- native 모듈 우회 스크립트는 prebuilt를 주는 패키지로 바꿔 지웠다. 설치 과정이 `yarn install` 하나로 돌아왔다.
- 아이콘 일괄 교체는 짝이 애매한 것을 따로 적어 두고, 검색 결과 0과 빌드 통과로 확인했다.
- DPI가 다른 모니터에서 창 크기가 변하는 문제는 화면마다 창을 새로 만드는 방식으로 피했다.
