---
title: "캔버스 그리드에서 한글 첫 글자가 사라지던 문제와 숨은 textarea"
description: "Glide Data Grid에서 셀을 고르고 바로 한글을 치면 첫 글자가 영문으로 바뀌거나 사라졌다. 선택한 셀 위치에 보이지 않는 textarea를 두어 IME가 켜진 채로 첫 키를 받게 했고, 그 때문에 생긴 우클릭 메뉴 멈춤과 선택 표시 깜빡임도 고쳤다."
date: 2026-10-12
category: "Tech/React"
tags: ["react", "glide-data-grid", "ime", "korean", "canvas", "typescript"]
series: "레거시 ERP 이관기"
seriesOrder: 6
---

회사 ERP를 새 스택으로 옮기면서 그리드도 바꿨다. 업무 화면 대부분이 표에 값을 넣고 저장하는 구조라서 그리드는 ERP에서 가장 많이 쓰는 부품이다. 새 그리드에서 한글 첫 글자가 사라지는 문제가 있었고, 이를 고친 방법이 또 다른 문제를 만들었다.

코드는 대부분 AI 코딩 에이전트가 썼다. 다만 이 문제는 사람이 직접 쳐 보지 않으면 고쳐졌는지 확인할 수 없었다. 이유는 뒤에 적는다.

## Glide Data Grid를 고른 이유

기존 그리드는 react-datasheet-grid였고, 공용 래퍼 하나를 70개가 넘는 화면이 쓰고 있었다. 새로 만들면서 꼭 필요한 기능은 두 가지였다.

- **범위 선택**: 여러 칸을 드래그로 잡고 복사하거나 지우기
- **범위 붙여넣기**: 엑셀에서 복사한 여러 행·여러 열을 한 번에 붙여넣기

먼저 AG Grid를 봤는데, 범위 선택과 범위 붙여넣기는 Community 판에 없고 유료(Enterprise) 기능이다. Glide Data Grid는 둘 다 무료로 기본 지원한다(`rangeSelect="multi-rect"`, `onPaste`). 라이선스도 MIT다. 캔버스로 그려서 행이 많아도 빠르다는 점도 컸다.

감수할 것도 있었다. React 19에서 쓰려면 베타 태그 버전을 써야 해서 `^` 없이 버전을 고정했다. 셀 안은 캔버스라 Tailwind 같은 CSS가 먹지 않고, 색은 theme 객체로 맞춰야 한다. 한글 입력에 문제가 있다는 것도 미리 알고 있었다. 결정 문서에 "해결을 시도하고, 안 되면 감수하고 쓴다"고 적어 두고 시작했다.

## 증상: ㅌ을 쳤는데 x가 들어간다

셀을 클릭해서 고른 다음 바로 "테스트"를 치면 첫 글자가 `x`로 들어가거나 아예 빠졌다. 더블클릭으로 편집기를 먼저 열고 치면 문제가 없었다. 엑셀처럼 고르고 바로 치는 사용자는 매번 첫 글자가 틀렸다.

Glide 저장소에도 비슷한 이슈가 있었다. React 19에서 첫 타이핑 때 편집기가 늦게 열려 입력이 빠진다는 내용이었고, 편집기를 미리 불러 두는 수정 PR이 올라와 있었지만 반영 전이었다. 처음에는 이 방향으로 접근했다.

그런데 원인은 더 아래에 있었다. **캔버스에 포커스가 있는 동안 브라우저는 한글 입력기(IME)를 켜지 않는다.** IME는 입력할 수 있는 요소(input, textarea, contenteditable)에 포커스가 있을 때 조합을 시작한다. 캔버스 그리드에서 키 이벤트를 받는 요소는 입력 요소가 아니다. 그래서 첫 키는 IME를 거치지 않은 물리 키 값, 즉 `ㅌ` 자리의 `x`로 들어온다. 편집기가 열려 textarea가 생긴 뒤에야 한글이 입력된다.

## 첫 시도: keydown 순간에 입력칸 띄우기

처음에는 이렇게 했다. 셀이 선택된 상태에서 keydown의 `key`가 `"Process"`(또는 `keyCode === 229`)이면 IME가 조합을 시작하려는 신호로 본다. 그 keydown 안에서 셀 위에 textarea를 띄우고 포커스를 옮긴다. 같은 이벤트 안에서 포커스가 옮겨져야 조합이 그 칸으로 이어지기 때문에 `flushSync`로 상태를 바로 반영했다.

이 방식에서 버그 두 개가 바로 나왔다.

- 이미 열린 편집칸(Glide 기본 편집기나 드롭다운 찾기 칸)에서 친 한글도 "셀에서 바로 입력"으로 잘못 잡았다. React 포털로 뜬 편집기의 키 이벤트가 그리드 컨테이너까지 올라오기 때문이다. 그래서 보조 입력칸이 편집기 위에 하나 더 겹쳐 떴다.
- 보조 입력칸이 셀 그림 아래에 깔려 글자가 안 보였다. `document.body`로 포털을 옮기고 z-index를 올려서 고쳤다.

첫 번째는 이벤트 대상이 이미 input·textarea 안이면 건너뛰게 해서 고쳤다. 하지만 keydown 순간에 포커스를 옮기는 방식은 언제나 한 박자 늦는다는 문제가 남았다.

## sink: 선택된 셀 위에 보이지 않는 textarea를 미리 둔다

그래서 순서를 뒤집었다. 키를 누른 다음 입력칸을 만드는 대신, **셀을 고르는 순간 보이지 않는 textarea에 포커스를 미리 준다.** 이 칸을 sink(키 받는 칸)라고 불렀다. 포커스가 처음부터 textarea에 있으니 IME가 켜진 상태로 첫 키를 받는다. AG Grid 같은 DOM 기반 그리드가 편집 셀에서 쓰는 방식과 비슷하다.

sink에 들어온 키는 세 가지로 나눠 처리한다.

- **조합 시작**(`isComposing`, `"Process"`, 229): 그 자리에서 편집 모드로 바꾼다. 첫 글자부터 한글이다.
- **인쇄 가능한 한 글자**(영문·숫자): 그 글자로 편집을 시작한다.
- **그 밖의 키**(방향키, Tab, Enter, Delete, F2, Ctrl 조합): 그리드로 돌려준다. 포커스를 캔버스로 옮기고 같은 키 이벤트를 다시 만들어 보낸다.

```tsx title="key-sink.tsx (원리만 다시 쓴 예시)"
type Rect = { x: number; y: number; width: number; height: number };

export function KeySink({ rect, onStartEdit, forwardToGrid }: {
  rect: Rect | null;                    // 선택된 셀의 화면 좌표 (없으면 숨김)
  onStartEdit: () => void;              // 편집 모드로 전환
  forwardToGrid: (e: KeyboardEvent) => void;
}) {
  return createPortal(
    <textarea
      tabIndex={-1}
      aria-label="셀 입력"
      // 숨겨도 선택 셀 위치에 둔다 — IME 후보창이 셀 옆에 뜬다
      style={rect
        ? { position: "fixed", left: rect.x, top: rect.y, width: rect.width, height: rect.height, opacity: 0, pointerEvents: "none" }
        : { position: "fixed", left: -9999 }}
      onKeyDown={(e) => {
        const k = e.nativeEvent;
        if (k.isComposing || k.key === "Process" || k.keyCode === 229) return onStartEdit(); // 한글 조합
        if (k.key.length === 1 && !k.ctrlKey && !k.metaKey && !k.altKey) return onStartEdit(); // 영문·숫자
        // Ctrl+C·V 는 막지 않는다 — copy/paste 이벤트가 그리드로 가야 한다
        if (!k.ctrlKey && !k.metaKey) e.preventDefault();
        forwardToGrid(k);
      }}
    />,
    document.body,
  );
}

// 그리드로 키 넘기기: 포커스를 옮긴 뒤 같은 키를 다시 보낸다
export function forward(grid: { focus(): void }, k: KeyboardEvent) {
  grid.focus();
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", {
    key: k.key, code: k.code, keyCode: k.keyCode,
    shiftKey: k.shiftKey, ctrlKey: k.ctrlKey, metaKey: k.metaKey, altKey: k.altKey,
    bubbles: true, cancelable: true,
  }));
}
```

그 밖에 정한 것들이다.

- sink는 **글자 칸을 하나만 고른 상태**에서만 켠다. 범위를 잡았거나, 수정할 수 없는 칸이거나, 버튼 칸이면 켜지 않는다. 범위 복사·붙여넣기는 그리드가 직접 받아야 한다.
- 숨은 상태에서도 textarea를 **선택 셀 좌표에 둔다.** 화면 밖(-9999px)에 두면 IME 후보창(한자 변환 창 등)이 화면 구석에 뜬다.
- 클릭이나 편집 종료로 그리드가 포커스를 다시 받으면 `setTimeout(…, 0)`으로 한 박자 뒤에 sink를 다시 켠다. Glide가 포커스 처리를 끝낸 뒤에 가져와야 서로 덮어쓰지 않는다.
- Ctrl+D는 브라우저 북마크 단축키라 막았다.

> [!NOTE]
> 이 동작은 자동화 테스트로 확인할 수 없었다. 브라우저 자동화 도구로는 실제 IME 조합 이벤트를 만들 수 없기 때문이다. 첫 글자, 연속 입력, 조합 중 Enter·Tab·방향키, 붙여넣기 후 입력을 확인 항목으로 두고 사람이 직접 쳐서 확인했다.

## 목록(코드) 칸도 첫 글자부터

글자 칸을 고친 다음은 드롭다운 칸이었다. 부서나 직급처럼 코드 목록에서 고르는 칸인데, 여기서 바로 "영업"을 치면 아무 반응이 없었다.

같은 sink를 썼다. 목록 칸에서 조합이 시작되면 sink가 그대로 **찾기 칸**이 되고, 그 아래에 맞는 값 목록을 띄운다. ↑↓로 고르고, Enter·Tab·클릭으로 정하고, Esc로 취소한다. 목록을 거르는 비교는 치는 중인 글자도 맞도록 자모 단위로 한다. "영업"을 치는 도중인 "영ㅇ" 상태에서도 "영업"이 목록에 남아 있어야 하기 때문이다. 이 부분은 다음 글에 따로 적었다.

## 부작용 1: 우클릭 메뉴를 열면 브라우저가 멈춘다

sink를 넣은 뒤로 그리드에서 우클릭 메뉴를 열면 브라우저가 멈췄다. 포커스를 서로 가져가려고 다툰 것이 원인이었다.

1. 우클릭 메뉴가 열리면서 자기 틀에 포커스를 준다.
2. 그리드 컨테이너의 focus 캡처가 이를 보고 sink를 다시 켜서 포커스를 가져온다.
3. 메뉴는 그릴 때마다 포커스를 다시 잡는다. 메뉴의 effect가 `onClose`에 의존했는데, 부르는 쪽이 매번 새 함수를 넘겨서 렌더마다 effect가 다시 돌았다.
4. 2와 3이 끝없이 반복됐다.

두 군데를 고쳤다. sink는 지금 포커스가 `[role=menu]` 안에 있으면 켜지 않는다. 메뉴는 열릴 때 한 번만 포커스를 주고, 닫기 함수는 ref로 들고 있어서 effect가 다시 돌지 않게 했다.

```tsx title="context-menu.tsx (원리만 다시 쓴 예시)"
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => { ref.current = value; });
  return ref;
}

export function ContextMenu({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useLatest(onClose);

  useEffect(() => {
    box.current?.focus({ preventScroll: true }); // 열릴 때 한 번만
    const outside = (e: Event) => { if (!box.current?.contains(e.target as Node)) close.current(); };
    window.addEventListener("pointerdown", outside, true);
    return () => window.removeEventListener("pointerdown", outside, true);
  }, []); // onClose 에 의존하지 않는다

  return <div ref={box} role="menu" tabIndex={-1}>{children}</div>;
}
```

포커스를 자동으로 가져가는 장치가 둘 이상이면 서로 부딪히기 쉽다. 이번에는 sink 쪽에 포커스를 가져오면 안 되는 곳의 목록을 두었다.

## 부작용 2: 방향키로 옮긴 칸이 칠해졌다 안 칠해졌다

다음은 선택 표시였다. 방향키로 칸을 옮기면 선택된 칸 바탕이 칠해졌다가 안 칠해졌다가 했다. 방향키로 갔다가 돌아오면 표시가 사라지기도 했다.

Glide는 선택된 칸 바탕을 **그리드에 포커스가 있을 때만** 진하게 칠하고, 이 포커스 표시는 debounce를 거쳐 늦게 바뀐다. 그런데 sink를 쓰면서 방향키를 누를 때마다 포커스가 sink → 그리드 → sink로 오갔다. 그리드로서는 포커스가 있다 없다 하니 칠하는 결과도 오락가락했다.

먼저 선택 표시를 Glide에 맡기지 않고 직접 칠했다. 칸 하나를 고른 동안은 `highlightRegions`로 늘 같은 불투명 색과 테두리를 그린다. 불투명 색이라 Glide가 자기 색을 함께 칠해도 결과가 같다.

그래도 방향키로 옮긴 칸이 가끔 안 칠해졌다. Glide는 선택이 움직일 때 바뀐 칸만 먼저 다시 그린다. 그런데 `highlightRegions`는 선택이 바뀐 **다음 렌더**에 바뀌고, Glide는 이 값이 바뀐 것만으로는 칸 바탕을 다시 그리지 않았다. 그래서 선택이 바뀌면 옛 칸과 새 칸을 직접 다시 그리게 했다.

```tsx title="use-redraw-selection.ts (원리만 다시 쓴 예시)"
export function useRedrawOnSelect(grid: RefObject<DataEditorRef>, cell: Item | undefined) {
  const prev = useRef<Item | null>(null);
  const key = cell ? `${cell[0]}:${cell[1]}` : "";
  useEffect(() => {
    const cells = [cell, prev.current].filter((c): c is Item => !!c).map((c) => ({ cell: c }));
    if (cells.length) grid.current?.updateCells(cells); // 옛 칸·새 칸 바탕을 다시 그린다
    prev.current = cell ?? null;
  }, [key]);
}
```

> [!TIP]
> 캔버스 그리드에서는 상태가 바뀌면 다시 그려진다는 React의 기대가 그대로 통하지 않는다. 라이브러리가 어떤 변화에 어떤 칸을 다시 그리는지 확인하고, 모자란 부분은 `updateCells` 같은 API로 직접 요청해야 한다.

## 정리

- AG Grid 대신 Glide Data Grid를 고른 이유는 범위 선택·범위 붙여넣기를 무료로 쓸 수 있어서였다. 한글 입력 문제는 알고 시작했다.
- 첫 글자가 영문으로 들어간 원인은 캔버스에 포커스가 있으면 브라우저가 IME를 켜지 않기 때문이었다.
- keydown 순간에 입력칸을 띄우는 방식은 한 박자 늦었다. 셀을 고르는 순간 보이지 않는 textarea(sink)에 포커스를 미리 주는 방식으로 바꿨다.
- sink는 선택 셀 좌표에 두어 IME 후보창이 셀 옆에 뜨게 했다. 조합과 글자 키는 편집으로, 나머지 키는 그리드로 다시 보냈다.
- 같은 sink로 목록 칸도 첫 글자부터 찾기 칸이 되게 했다.
- 포커스를 자동으로 가져가는 장치끼리 부딪혔다. 메뉴 안에서는 sink를 켜지 않고, 메뉴는 열릴 때 한 번만 포커스를 잡게 고쳤다.
- 포커스가 오가면서 선택 표시가 흔들리는 문제는 선택 칸을 직접 칠하고, 선택이 바뀔 때 옛 칸·새 칸을 다시 그려서 고쳤다.
- IME 조합은 자동화로 재현할 수 없어서 직접 쳐 보는 확인 목록을 따로 두었다.
