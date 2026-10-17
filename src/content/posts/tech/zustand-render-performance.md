---
title: "Zustand 구독을 좁히고 드래그 중에는 store를 건드리지 않기"
description: "노코드 UI 빌더와 그것을 담은 IDE에서 리렌더를 줄인 작업 네 가지를 정리했다. 객체 구독을 boolean selector로 바꾼 일, 드래그 중 store 갱신을 0회로 만든 일, 영역 선택 라이브러리를 직접 만든 훅으로 바꾼 일, 검색 결과 리스트를 memo로 막은 일이다."
date: 2026-10-17
category: "Tech/Editor"
tags: ["react", "zustand", "performance", "konva", "typescript"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 4
draft: true
---

[앞 글](/posts/define-widget-micro-store/)에서 위젯마다 작은 Zustand store를 둔 구조를 정리했다. 구조가 구독을 좁힐 수 있게 해 줘도, 실제로 좁게 구독하는지는 코드 한 줄에 달려 있다. 이 글은 빌더와 그것을 담은 IDE에서 리렌더를 줄인 작업 네 가지를 모은 것이다.

네 작업 모두 같은 질문에서 시작했다. 이 컴포넌트는 무엇이 바뀔 때 다시 그려져야 하는가. 그리고 지금은 무엇이 바뀔 때 다시 그려지고 있는가.

## 먼저 보이게 했다

리렌더 문제는 눈으로 찾기 어렵다. 화면이 느려졌다는 느낌은 있는데 어느 컴포넌트 때문인지는 모른다. 첫 자체 빌더를 만들던 2025년 9월부터 react-scan을 붙여 썼다. 다시 그려지는 컴포넌트에 테두리가 깜빡이니, 드래그 한 번에 어디까지 번지는지 바로 보인다.

## 객체를 구독하던 칩을 boolean으로

IDE 왼쪽 레일에는 패널 아이콘 칩이 늘어서 있다. 칩을 끌어 패널을 다른 자리에 도킹한다. 끌리는 칩은 반투명하게 보여야 한다.

react-scan으로 보니 패널 하나를 끌어 놓을 때마다 칩 전부가 다시 그려졌다. 패널이 다섯 개면 드래그 한 번에 리렌더가 10번이었다. 시각적으로 바뀌는 것은 끌리는 칩 하나뿐이었다.

원인은 구독 대상이었다. 칩마다 store의 드래그 상태 객체 전체를 구독하고, 그 안의 패널 id를 자기 id와 비교했다.

```tsx title="rail-chip-before.tsx"
function RailChip({ panel }: { panel: Panel }) {
  const dragging = useDockingStore((s) => s.dragging); // { panelId, fromSlot } | null
  const state = dragging?.panelId === panel.id ? 'dragging' : 'idle';
  return <Chip state={state} />;
}
```

드래그가 시작되거나 끝날 때마다 `dragging` 객체의 참조가 바뀐다. 모든 칩의 selector 결과가 바뀌니 모든 칩이 다시 그려진다.

비교를 selector 안으로 옮겼다.

```tsx title="rail-chip-after.tsx"
const useIsDraggingPanel = (id: string) =>
  useDockingStore((s) => s.dragging?.panelId === id);

function RailChip({ panel }: { panel: Panel }) {
  const isDragging = useIsDraggingPanel(panel.id);
  return <Chip state={isDragging ? 'dragging' : 'idle'} />;
}
```

이제 selector는 boolean을 돌려준다. 다른 패널을 끌어도 내 칩의 결과는 `false`에서 `false`라 Zustand가 리렌더를 건너뛴다. 커밋에는 드래그 시 리렌더 80% 감소로 기록했다. 끌리는 칩만 시작과 끝에 다시 그려지니 계산상 10번이 2번이 된 셈이다. 드래그 상태 객체 전체가 필요한 곳은 도킹 오버레이 한 곳뿐이라 그쪽은 그대로 두었다. AI 코딩 에이전트와 함께 작업했다.

> [!TIP]
> selector는 "컴포넌트가 그리는 데 필요한 값"까지 계산해서 돌려주는 편이 좋다. 객체를 받아 컴포넌트 안에서 비교하면 비교 결과가 같아도 리렌더는 일어난다.

## 드래그 중에는 store를 건드리지 않았다

IDE에는 도트 그림을 그리는 작은 스프라이트 에디터가 있다. 캔버스는 Konva로 그린다. 영역을 끌어 선택하면 파란 점선과 흰 점선 사각형, 그리고 크기 조절 핸들 8개가 따라온다.

처음에는 `requestAnimationFrame`으로 갱신 빈도만 묶었다. 그래도 큰 영역을 끌면 버벅였다. 프레임마다 `setSelection`을 불렀기 때문이다. store가 바뀌면 React가 다시 렌더하고, react-konva가 props를 비교해 Konva 노드 속성을 다시 적용한다. 60Hz로 이 경로를 도는 비용이 쌓였다.

드래그 중에는 store를 아예 건드리지 않게 바꿨다. 사각형과 핸들 노드를 ref로 잡아 두고, 현재 영역은 ref에만 둔다. 프레임마다 Konva 노드의 속성을 직접 바꾸고 레이어를 한 번 다시 그린다. 마우스를 놓을 때만 store에 한 번 커밋한다.

```tsx title="selection-drag.tsx"
const pendingRef = useRef<Rect | null>(null);
const rafRef = useRef<number | null>(null);
const outlineRef = useRef<Konva.Rect>(null);
const layerRef = useRef<Konva.Layer>(null);

function schedule(rect: Rect) {
  pendingRef.current = rect;
  if (rafRef.current !== null) return;
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    const r = pendingRef.current;
    if (!r) return;
    outlineRef.current?.setAttrs({ x: r.x, y: r.y, width: r.w, height: r.h });
    layerRef.current?.batchDraw(); // React 를 거치지 않는다
  });
}

function flush() {
  if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  rafRef.current = null;
  const r = pendingRef.current;
  pendingRef.current = null;
  if (r) setSelection(r); // mouseup 에서 한 번만
}
```

커밋 직후 React가 store 값으로 다시 그리지만, Konva 노드는 이미 같은 값을 갖고 있어 화면 변화는 없다. 핸들 크기 조절도 같은 방식으로 바꿨다. 이전에는 핸들을 끌 때 `setSelection`을 동기로 불렀다.

빌더 캔버스도 같은 원칙을 쓴다. 위젯 위치와 크기는 위젯 store를 `subscribe`해서 DOM을 직접 고치고, 놓을 때 schema에 한 번 커밋해 히스토리 하나를 남긴다.

## 영역 선택 라이브러리를 걷어냈다

빌더 캔버스의 빈 곳을 끌어 여러 위젯을 고르는 기능은 react-selecto로 만들었다. 기능은 됐지만 감싸는 코드가 점점 늘었다.

- Shift로 추가 선택하려고 라이브러리의 keydown, keyup 콜백에서 따로 플래그를 관리했다.
- 클릭과 드래그를 구분하려고 선택 사각형이 5px 이하면 무시하는 조건을 넣었다.
- 캔버스 스크롤과 맞추려고 스크롤 옵션을 state로 들고, 스크롤 이벤트마다 `checkScroll`을 불렀다.
- 결과에서 다른 선택 요소 안에 든 자식을 걸러 내는 일은 결국 직접 했다.

2026년 6월 4일, react-selecto를 빼고 pointer 이벤트로 직접 만든 훅으로 바꿨다. 훅은 135줄이다. AI 코딩 에이전트와 함께 작업했다.

```ts title="use-marquee.ts"
function useMarquee(onSelect: (ids: string[], additive: boolean) => void, threshold = 8) {
  const boxRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number; captured: boolean } | null>(null);

  const draw = (r: DOMRectLike | null) => {
    const el = boxRef.current;
    if (!el) return;
    el.style.display = r ? 'block' : 'none';
    if (r) Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`,
      width: `${r.width}px`, height: `${r.height}px` });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.captured) {
      if (Math.abs(e.clientX - s.x) < threshold && Math.abs(e.clientY - s.y) < threshold) return;
      s.captured = true;
      e.currentTarget.setPointerCapture(s.id); // 드래그로 확정된 뒤에만 캡처
    }
    draw(rectFrom(s, e)); // setState 없음
  };

  /* onPointerDown: 빈 영역이면 start 기록, onPointerUp: 감싸진 요소 hit-test 후 onSelect */
  return { boxRef, onPointerMove /* , onPointerDown, onPointerUp, onPointerCancel */ };
}
```

Shift는 이벤트의 `shiftKey`를 그대로 읽는다. 클릭과 드래그는 이동 거리 8px 기준으로 나눈다. pointer capture는 드래그가 확정된 뒤에만 건다. 처음부터 걸면 Shift+클릭으로 위젯 하나를 토글하는 동작까지 가로챈다. 선택 상자는 ref로 스타일만 바꾸니 드래그 중 리렌더가 없다. 놓을 때 요소 전체가 상자 안에 들어온 것만 고르고, 다른 선택 요소에 포함된 자식은 뺀다. 시스템 제스처로 `pointercancel`이 오면 상자를 바로 지운다.

react-selecto가 빠지면서 함께 딸려 오던 selecto도 lock 파일에서 빠졌다. 같은 날 선택 상자가 캔버스 가장자리에 닿으면 자동으로 스크롤하는 기능도 이 훅 위에 붙였다.

## 검색어 한 글자마다 결과가 다시 그려졌다

IDE의 파일 검색 패널은 입력할 때 버벅였다. 검색 요청은 250ms 디바운스로 막고 있었다. 문제는 요청이 아니라 렌더였다.

검색 패널은 `useState`를 8개 넘게 갖고 있었다. 한 글자를 칠 때마다 패널이 다시 렌더되고, 아래의 결과 리스트도 함께 다시 평가됐다. 결과는 아직 이전 검색 그대로인데도 그랬다. 내용 검색은 최대 500줄을 잘라 하이라이트 조각으로 바꾸니 600개가 넘는 DOM 노드를 키 입력마다 비교했다. 메인 스레드가 그 일을 하는 동안 다음 입력이 늦게 처리됐다.

결과 리스트 두 개를 `React.memo`로 감싸고, 패널이 내려 주는 콜백 세 개를 `useCallback`으로 고정했다. 결과 배열은 검색할 때마다 새 객체로 오니 참조 비교로 충분하다. 이제 입력 중에는 입력칸과 컨트롤만 다시 그려진다. 가상 스크롤은 넣지 않았다. 결과가 수천 줄 단위가 되면 그때 검토하기로 했다. AI 코딩 에이전트와 함께 작업했다.

## 성능 분석 문서를 읽는 법

v5로 옮기면서 코어 store의 액션별 성능 분석 문서도 하나 남겼다. AI 코딩 에이전트와 함께 쓴 문서다. 액션마다 시간 복잡도, 리렌더 범위, dual-write 여부를 표로 정리했다. 쓸모 있는 지적이 몇 개 있었다.

- 모든 schema 쓰기가 트리 메타데이터를 처음부터 다시 만든다. 노드 수에 비례하는 일이 쓰기마다 일어난다. 변경된 노드만 고치는 방식이 다음 후보다.
- 위젯 store registry는 등록과 해제마다 `Map`을 통째로 복사한다. 파일을 열어 노드를 한꺼번에 등록하면 제곱으로 늘어난다.
- 노드 복제가 `JSON.parse(JSON.stringify())`로 깊은 복사를 한다.

> [!WARNING]
> 이 문서의 밀리초 수치는 측정값이 아니라 추정값이다. 표에도 "추정 시간"이라고 적혀 있다. 구조의 병목을 찾는 데는 도움이 됐지만, "노드 500개까지 괜찮다" 같은 결론은 실제로 재 보기 전까지 근거로 쓰지 않았다. 실제 숫자로 남긴 것은 react-scan으로 센 리렌더 횟수뿐이다.

## 정리

- react-scan으로 리렌더를 먼저 보이게 했다. 문제는 대개 느낌이 아니라 테두리 깜빡임으로 찾았다.
- 객체를 구독하고 컴포넌트 안에서 비교하면 모두가 다시 그려진다. 비교를 selector로 옮겨 boolean을 돌려주니 리렌더가 80% 줄었다.
- 드래그 중 위치는 ref와 직접 조작으로 그리고, store에는 놓을 때 한 번 커밋한다. 스프라이트 에디터와 빌더 캔버스가 같은 원칙을 쓴다.
- 영역 선택 라이브러리를 감싸는 코드가 라이브러리보다 복잡해지면 직접 만드는 편이 낫다. pointer 이벤트와 ref로 135줄이면 충분했다.
- 디바운스는 요청을 막을 뿐 렌더를 막지 않는다. 입력과 무관한 리스트는 memo로 떼어 냈다.
- 에이전트가 쓴 성능 문서의 숫자는 추정인지 측정인지부터 확인한다.
