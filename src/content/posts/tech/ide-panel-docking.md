---
title: "dockview 옆에 패널 도킹을 직접 만들었다: 슬롯, 상태 전환, 탭"
description: "Electron IDE의 사이드 패널을 dockview 대신 직접 만든 도킹 시스템으로 옮긴 과정을 정리했다. 슬롯 6개, 패널 상태 사이의 invariant, 슬롯 안의 탭, 다시 mount하지 않는 위치 이동, 레이아웃 저장을 다룬다."
date: 2026-10-17
category: "Tech/React"
tags: ["react", "zustand", "electron", "state-management", "ui"]
series: "Electron IDE 개발기"
seriesOrder: 2
draft: true
---

1편에서 IDE 모노레포를 정리한 이야기를 했다. 이번에는 화면 쪽이다. IDE 가운데의 에디터 탭은 dockview로 붙였다 떼었다 한다. 그런데 좌우와 하단의 사이드 패널(탐색기, 검색, Git, 콘솔 같은 것)은 dockview를 쓰지 않고 도킹 시스템을 따로 만들었다. 이 글은 그 시스템을 어떻게 나눴고 어디서 상태가 꼬였는지 정리한 것이다.

2026년 5월부터 6월까지의 작업이고, 대부분 AI 코딩 에이전트와 함께 작업했다.

## 2025년 7월: dockview 하나로 버티던 때

처음 IDE는 구조가 단순했다. 가운데는 dockview, 좌우는 `react-resizable-panels`로 나눈 고정 영역이었다. 왼쪽에 메뉴 두 묶음, 오른쪽에 두 묶음이 있고 메뉴를 고르면 그 영역에 내용이 뜨는 방식이었다.

그때 손본 것은 dockview 상태를 React에 넘기는 방법이었다. 활성 패널이 바뀌면 그 패널의 api와 params를 Context 하나에 통째로 넣고 있었다. 그러면 탭을 바꿀 때마다 Context 아래가 전부 다시 그려진다. 그래서 컨테이너 api, 활성 패널 api, 활성 params를 zustand store의 필드로 나눴다. 필요한 곳은 필요한 필드만 구독한다. params가 바뀌는 이벤트는 패널이 추가될 때 구독하고, 그 패널이 지금 활성인지는 ref로 확인했다. persist도 디렉토리 정보만 저장하게 줄였다.

이 구조에서 이미 "왼쪽 위, 왼쪽 아래" 같은 칸 개념이 있었다. 다만 칸에 무엇이 들어갈지가 코드에 박혀 있었다. 사용자가 패널을 끌어서 옮길 수는 없었다.

## 중앙은 dockview, 사이드는 직접

새 IDE에서는 사이드 패널도 끌어서 배치하게 하고 싶었다. dockview를 사이드까지 넓히는 방법도 있었다. 하지만 원하는 모양은 자유 분할 그리드가 아니었다. 정해진 칸 몇 개, 왼쪽 끝의 아이콘 줄(rail), 아이콘을 누르면 본문만 접히는 동작이 필요했다. 빌더 탭 안에도 같은 도킹이 따로 하나 더 있어야 했다.

그래서 dockview는 중앙 탭과 분할 전용으로 남기고, 사이드는 직접 만들었다. 칸은 6개로 고정했다.

- L1, L2: 왼쪽 위/아래
- R1, R2: 오른쪽 위/아래
- B1, B2: 하단 왼쪽/오른쪽(좌우 사이드보다 우선해 전체 너비를 쓴다)

store는 전역 하나가 아니라 Provider가 mount될 때마다 새로 만든다. 처음에는 전역 하나였는데, IDE 셸과 빌더 탭이 같은 store를 쓰면서 슬롯이 충돌했다. Provider 단위로 나누자 셸과 빌더 탭의 슬롯, 등록, 도킹 상태가 완전히 분리됐다.

## 패널이 가질 수 있는 상태

패널 하나는 다음 중 하나다.

- **rail에만 있음**: 등록은 됐지만 어느 슬롯에도 없다. 아이콘만 보인다.
- **docked, 보임**: 슬롯에 있고 본문이 보인다.
- **docked, 숨김(invisible)**: 슬롯 자리는 유지하고 본문만 끈다. rail 아이콘을 누르면 이 상태를 오간다.
- **floating**: 슬롯 밖에서 떠 있는 창이다.
- **hidden**: rail 목록에서도 뺀다.

rail 아이콘을 눌렀을 때 도킹을 풀지 말지가 처음에 헷갈렸다. 결국 아이콘 클릭은 본문 표시만 바꾸고, 도킹 해제는 해제 영역으로 끌어다 놓거나 우클릭 메뉴로만 하게 했다. 실수로 배치가 풀리는 일이 줄었다.

floating도 처음에는 슬롯에서 빼고 띄웠다. 그러면 "다시 도킹"할 때 원래 자리를 따로 기억해야 했다. 같은 날 바로 바꿔서, floating으로 바꿔도 슬롯 기록은 그대로 두고 슬롯 본문만 숨기게 했다. 다시 도킹은 floating 창을 닫기만 하면 된다.

## 상태 전환 invariant

floating을 붙이고 며칠 뒤 문제가 보였다. floating으로 띄운 패널을 슬롯에 다시 끌어다 놓으면 슬롯과 floating 창 양쪽에 같은 패널이 보였다. hidden으로 숨긴 패널이 floating으로는 떠 있는 경우도 있었다.

원인은 정리 코드가 한 action에만 있었다는 점이다. 숨기기(hide)는 도킹을 함께 풀었는데, 도킹·등록 해제·숨기기 어디에도 floating 창을 닫는 코드는 없었다. 상태끼리 서로 겹치면 안 된다는 규칙이 머릿속에만 있었다.

그래서 규칙을 action마다 적었다.

- 명시적으로 도킹하면 같은 패널의 floating 창을 닫는다.
- 등록을 해제하면 슬롯, floating, 표시 상태를 모두 지운다.
- rail에서 숨기면 슬롯과 floating을 모두 정리한다.
- floating으로 바꾸는 것은 예외다. 슬롯 기록을 일부러 남긴다.

```ts title="dock-panel.ts"
function dockPanel(state: DockState, panelId: string, slot: SlotId) {
  // 규칙 1: 명시적 도킹은 floating 인스턴스를 정리한다
  if (state.floating[panelId]) closeFloating(state, panelId);

  const from = findSlotOf(state.layout, panelId);
  if (from && from !== slot) removeFromSlot(state.layout, from, panelId);

  const target = state.layout[slot];
  if (!target.panelIds.includes(panelId)) target.panelIds.push(panelId);
  target.activeId = panelId;
  delete state.invisible[panelId]; // 활성으로 올리면 본문도 보이게
}
```

슬롯 쪽 렌더러도 floating 인스턴스가 있으면 본문을 그리지 않게 했다. invisible은 상태를 지키려고 숨긴 채 mount를 유지하고, floating은 슬롯에서 아예 빼서 다른 레이어가 그린다. 두 경우를 섞지 않았다.

> [!NOTE]
> 상태가 서로 배타적이라면 그 규칙은 상태를 바꾸는 모든 action에 들어가야 한다. 한 군데에만 있으면 다른 경로로 들어온 순간 깨진다.

## 한 슬롯에 여러 패널: 탭

처음에는 슬롯 하나에 패널 하나만 들어갔다. 점유된 슬롯에 다른 패널을 놓으면 원래 패널이 빠졌다. 쓰다 보니 하단에 Git과 콘솔을 같이 두고 바꿔 보고 싶었다.

레이아웃 모델을 `슬롯 → 패널 id`에서 `슬롯 → { panelIds, activeId }`로 바꿨다. 점유된 슬롯에 놓으면 교체하지 않고 그룹에 추가한다. 패널 헤더 오른쪽에 아이콘 스위처를 두었고, 같은 날 이어서 탭 드래그, 가운데 클릭으로 닫기, 우클릭 메뉴, 넘칠 때 가로 스크롤을 붙였다. 탭 드래그는 rail 아이콘의 드래그 hook을 그대로 썼다.

활성 패널을 빼면 다음 활성을 고르는 규칙이 필요했다. 오른쪽 이웃, 없으면 왼쪽 이웃이다.

```ts title="remove-from-slot.ts"
function removeFromSlot(layout: Layout, slot: SlotId, panelId: string) {
  const s = layout[slot];
  const i = s.panelIds.indexOf(panelId);
  if (i === -1) return;
  s.panelIds.splice(i, 1);
  if (s.activeId === panelId) {
    s.activeId = s.panelIds[i] ?? s.panelIds[i - 1] ?? null;
  }
}
```

모델이 바뀌면 저장된 옛 레이아웃이 문제다. 복원할 때 값이 문자열이면 옛 형식으로 보고 `{ panelIds: [id], activeId: id }`로 바꿨다. 기존 사용자의 레이아웃과 프리셋이 그대로 열린다.

> [!WARNING]
> 모델을 바꿀 때 `null` 검사가 조용히 의미를 잃을 수 있다. 다시 도킹하는 경로 중 하나에 "슬롯이 비어 있으면 도킹" 조건이 `!layout[slot]`로 남아 있었다. 슬롯 값이 항상 객체가 된 뒤로 이 조건은 늘 거짓이다. UI가 그 경로를 막고 있어서 드러나지 않았을 뿐이다. 타입이 바뀌면 그 값을 참/거짓으로 쓰는 곳도 함께 찾아야 한다.

## 위치를 옮겨도 다시 mount하지 않기

패널 본문은 원래 슬롯 컴포넌트가 직접 그렸다. 그러면 L1에서 R1으로 옮길 때 React는 다른 위치의 다른 컴포넌트로 본다. 그래서 unmount 후 다시 mount한다. outliner처럼 무거운 패널은 다시 초기화되면서 멈칫했다.

처음 대응은 `keepMounted` 옵션이었다. 도킹이 풀려도 화면 밖 숨은 컨테이너에 mount를 유지해 상태를 지킨다. 그다음에는 구조를 바꿨다. 슬롯은 빈 DOM 컨테이너를 레지스트리에 등록만 하고, 호스트 하나가 모든 패널을 한 번씩 mount한 뒤 `createPortal`로 현재 슬롯 컨테이너에 그린다.

```tsx title="panel-host.tsx"
function PanelHost() {
  const { panels, layout, floating } = useDockState();
  const { getContainer } = useSlotRegistry();
  const hidden = useHiddenContainer();

  return Object.values(panels).map((p) => {
    if (floating[p.id]) return null; // floating 레이어가 따로 그린다
    const slot = findSlotOf(layout, p.id);
    if (!slot && !p.keepMounted) return null;
    const visible = slot !== null && layout[slot].activeId === p.id;
    const target = (visible ? getContainer(slot) : null) ?? hidden;
    return target ? createPortal(<PanelFrame panel={p} />, target, p.id) : null;
  });
}
```

포털된 자식은 DOM 위치가 아니라 React 트리 위치에서 context를 받는다. 그래서 호스트를 패널들이 필요로 하는 provider 안쪽에 두었다.

> [!TIP]
> 포털의 대상 컨테이너가 바뀔 때 React가 하위 트리를 그대로 두는지는 따로 확인해야 한다. React의 reconciler는 portal을 갱신할 때 container가 다르면 새 fiber를 만든다. 이동 전후에 패널 안의 입력값이나 스크롤이 남는지 직접 보고 판단하는 편이 안전하다.

## 레이아웃 저장과 프리셋

도킹 모듈은 어디에 저장하는지 모르게 했다. 쓰는 쪽이 저장된 값, 준비 여부, 저장 함수를 넘기면 hook이 복원과 자동 저장을 맡는다. 저장 대상은 슬롯 레이아웃, invisible 목록, hidden 목록이고 변경 후 500ms debounce로 저장한다.

복원에서 두 번 걸렸다. 설정은 비동기로 읽혀서 첫 렌더에는 값이 없다. 또 자식 effect가 부모 effect보다 먼저 돌아서, 복원하려는 시점에 패널 등록이 아직 끝나지 않을 수 있다. 그래서 저장된 레이아웃이 가리키는 패널이 모두 등록됐을 때만 복원하고, 성공한 뒤에야 "복원 완료"로 잠갔다. 그 전에는 값이나 등록이 바뀔 때마다 다시 시도한다. 자동 저장도 복원이 끝난 뒤에만 켠다. 그래야 빈 레이아웃이 저장된 값을 덮어쓰지 않는다.

프리셋은 세 칸이다. `⌘⇧1~3`으로 현재 레이아웃을 저장하고 `⌘1~3`으로 불러온다. 값은 사용자 설정에 넣었고, 불러오기는 같은 복원 함수를 쓴다. 등록되지 않은 패널 id는 복원할 때 건너뛴다.

## 정리

- 중앙 탭은 dockview에 두고, 고정 슬롯과 rail이 필요한 사이드 패널은 직접 만들었다. store는 Provider마다 따로 만든다.
- 패널 상태(rail, docked, invisible, floating, hidden)가 겹치지 않는다는 규칙은 상태를 바꾸는 모든 action에 넣어야 지켜졌다.
- 슬롯 모델을 `{ panelIds, activeId }` 스택으로 바꿔 탭을 붙였고, 옛 저장 형식은 복원할 때 변환했다.
- 슬롯 이동 때 다시 mount하지 않으려고 호스트 하나가 패널을 mount하고 포털 대상만 바꾸는 구조로 갔다. 실제로 상태가 남는지는 따로 확인해야 한다.
- 레이아웃 복원은 비동기 로딩과 effect 순서 때문에 "필요한 패널이 모두 등록됐을 때 한 번"으로 잠갔다.
