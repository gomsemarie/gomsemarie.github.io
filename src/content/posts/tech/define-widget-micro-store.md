---
title: "위젯마다 작은 store를 두고 dual-write를 한 곳으로 모으기"
description: "위젯 정의 함수 defineWidget을 v2에서 v5로 바꾸며 위젯별 Zustand store를 schema와 함께 쓰게 했다. 액션 8곳에 복사돼 있던 동기화 코드를 undo 스택의 patch를 읽는 함수 하나로 합쳤고, 멀티 패널에서 쓰기가 마지막에 열린 패널로 새던 버그를 store 클로저로 고쳤다."
date: 2026-06-25
category: "Tech/Editor"
tags: ["react", "zustand", "state-management", "editor", "typescript"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 3
---

노코드 UI 빌더의 위젯은 두 곳에서 돈다. 편집기 캔버스와, 실제 화면을 띄우는 뷰어다. 둘은 같은 React 컴포넌트를 쓴다. 위젯 작성자는 컴포넌트를 한 번만 쓰고, 편집용과 실행용은 빌더가 만들어 준다. 이 일을 하는 함수를 `defineWidget`이라고 불렀다.

`defineWidget`은 v2부터 v5까지 바뀌었다. 그 과정에서 위젯마다 작은 Zustand store를 두었고, 그 store와 저장 모델을 함께 쓰다가 문제가 두 번 생겼다.

## 왜 위젯마다 store인가

[시리즈 첫 글](/posts/no-code-builder-three-times/)에서 조건 세 개를 적었다. 저장 모델(schema)은 JSON으로 직렬화돼야 한다. 위젯 메서드는 직렬화할 수 없다. 위치와 크기는 드래그 중 React 렌더 없이 DOM에 반영돼야 한다.

schema 하나로는 이 조건을 다 맞출 수 없어서 표현을 둘로 나눴다.

- **schema**: 코어 store 안의 `Record<nodeId, Node>`. 파일로 저장되는 원본이다.
- **위젯 store**: 노드마다 하나씩 있는 작은 Zustand store. 속성 사본, 메서드, 뷰어 전용 내부 상태를 담는다.

위젯 store가 있으면 구독 범위가 좁아진다. 노드 하나의 위치가 바뀌면 그 노드 store의 위치 구독자만 반응한다. `subscribe`로 위치를 받아 DOM의 `transform`을 직접 고치면 React 렌더도 일어나지 않는다.

## v2: 컴포넌트 하나로 편집기와 뷰어

2026년 4월 1일에 v2를 넣었다. 그 전에는 편집기용 렌더러와 뷰어용 컴포넌트를 따로 썼다. v2부터는 컴포넌트 하나를 넘기면 둘 다 만들어진다. 위젯마다 micro-store를 두기 시작한 것도 이때다. 상태는 평평한 필드와 `actions` 객체로 나눴고, 액션은 Zustand처럼 `(set, get) => ({ ... })` 형태로 선언하게 했다.

이후 3주 동안 자잘한 변경이 이어졌다. 액션 updater를 immer 방식으로 바꿨고, 기본 속성(id, 위치, 크기, 표시 여부)을 정의 함수가 자동으로 합치게 했고, 리렌더 없이 읽고 쓰는 `get`, `set`을 props로 넘겼다.

그렇게 해서 v4의 컴포넌트 props는 이렇게 됐다.

```tsx title="widget-v4.tsx"
const Counter = defineWidget<Props, Methods>({ type: 'Counter' /* ... */ })(
  ({ definition, useImplement, useProperty, useProperties,
     useSubscribe, get, set, hooks, mode, bindRef }) => {
    const [count, setCount] = useProperty('count');
    return <button ref={bindRef} onClick={() => setCount((c) => c + 1)}>{count}</button>;
  },
);
```

props가 열 개였다. 훅을 props로 받으니 위젯 안의 자식 컴포넌트에서 쓰려면 다시 내려 줘야 했다. `mode`를 보고 편집기와 뷰어를 분기하는 코드도 위젯 안으로 들어와 버렸다.

## v5: 훅을 세 층으로 나눴다

4월 22일에 v5로 옮겼다. 위젯 store 묶음을 관리하는 registry 위에 훅을 세 층으로 얹었다.

- **Registry 훅**: store 등록과 해제. 빌더 내부에서만 쓴다.
- **Micro 훅**: id로 다른 위젯의 store에 접근한다. 위젯 트리 바깥에서 쓴다.
- **Scope 훅**: 위젯을 감싼 scope Provider 안에서 id 없이 자기 store에 접근한다.

위젯 props는 `definition`, `useImplement`, `bindRef` 세 개로 줄었다. 읽기는 scope 훅을 import해서 쓴다. 자식 컴포넌트는 위젯에 붙은 정적 훅을 쓰면 타입까지 따라온다.

```tsx title="widget-v5.tsx"
type Store = WidgetStore<{ count: number }, { increment: () => void }>;

const Counter = defineWidget<Props, Methods>({ type: 'Counter' /* ... */ })(
  ({ useImplement, bindRef }) => {
    const count = useScopeSelect((s: Store) => s.count);
    const { set } = useScopeActions<Store>();
    useImplement((set) => ({ increment: () => set((d) => { d.count++; }) }));
    return <button ref={bindRef} onClick={() => set((d) => { d.count++; })}>{count}</button>;
  },
);

function CounterBadge() {
  const count = Counter.useSelect((s) => s.count); // 자식은 정적 훅
  return <span>{count}</span>;
}
```

v5에서 함께 바꾼 것이 두 가지 더 있다. 메서드를 `state.methods.xxx` 아래에서 꺼내 store 루트에 바로 두었다. 스크립트에서 `getWidget('a').increment()`처럼 부르기 쉽게 하려고 그렇게 했다. 그리고 registry의 selector 구독에 `useShallow`를 씌웠다.

쓰기 경로도 모드에 따라 갈랐다. 뷰어에서는 위젯 store에 바로 쓴다. 편집기에서는 schema가 원본이므로, 쓰기가 브리지를 거쳐 코어 store의 schema로 간다. 그다음 schema의 변경이 위젯 store로 다시 내려와야 한다. 이 이중 쓰기를 dual-write라고 불렀다.

## 8곳에 복사된 동기화

dual-write는 처음에 액션마다 직접 썼다. 액션이 schema를 고친 뒤 바로 아래에서 위젯 store도 고쳤다. 그런데 액션마다 하는 일이 조금씩 달랐다.

- 속성 설정은 바뀐 키 하나만 `setState`했다.
- 노드 추가는 새 store를 만들어 등록했다.
- 노드 삭제는 등록을 해제했다.
- 노드 갱신은 속성 전체를 replace 모드로 덮어썼다.
- 이동은 새 위치가 지정된 노드만 위치를 고쳤다. 아웃라이너에서 순서만 바꿀 때 옛 위치로 되돌아가는 버그를 막으려고 넣은 예외였다.
- 복제와 일괄 복제, 붙여넣기는 서브트리를 재귀로 돌며 등록했다.

이런 블록이 8곳에 있었다. 새 액션을 만들다 이 블록을 빠뜨리면 schema에는 들어갔는데 화면에는 안 보이는 상태가 된다. 한편 undo/redo는 이미 다른 방법을 쓰고 있었다. 되돌린 patch에서 영향받은 노드 id를 뽑아 그 노드만 동기화했다.

6월 25일, 모든 쓰기 액션이 그 방법을 쓰게 바꿨다. 쓰기 액션은 전부 히스토리 래퍼를 거치고, 래퍼는 immer patch를 undo 스택에 쌓는다. 그러니 `set` 직후 스택 맨 위의 patch를 보면 무엇이 바뀌었는지 알 수 있다.

```ts title="commit-sync.ts"
function commitSync() {
  if (!registry) return;
  const top = get().history.undoStack.at(-1);
  const schema = get().schema;
  for (const id of affectedNodeIds(top?.patches ?? [])) {
    const node = schema[id];
    if (!node) {                         // 삭제된 노드
      registry.unregister(id);
      continue;
    }
    const store = registry.get(id);
    if (store) store.setState({ ...node.properties }); // partial merge
    else registry.register(id, createWidgetStore(node.properties));
  }
}
```

액션마다 있던 블록은 `commitSync()` 한 줄로 바뀌었다. 이동 액션의 예외도 필요 없어졌다. 순서만 바꾸면 위치 patch가 생기지 않으니 위치는 그대로 남는다.

`setState`를 partial로 부른 데는 이유가 있다. v5에서 메서드를 store 루트로 옮겼기 때문에, 노드 갱신이 쓰던 replace 모드로 속성 전체를 덮으면 루트에 있던 메서드까지 지워진다. merge로 써야 메서드가 남는다.

> [!WARNING]
> Zustand의 `setState(next, true)`는 상태를 통째로 바꾼다. 같은 store에 직렬화되는 값과 함수가 섞여 있으면 replace가 함수를 지운다. 사본을 동기화할 때는 merge를 기본으로 두는 편이 안전하다.

undo/redo 쪽 동기화 함수는 patch를 얻는 곳이 달라서 그대로 두었다. 둘 다 partial로 맞추는 일이 아직 남아 있다.

## 마지막에 마운트된 패널로 쓰기가 몰렸다

같은 날 그보다 조금 앞서 다른 버그를 고쳤다. IDE에서 빌더 파일 두 개를 나란히 열고 편집하면, 활성 패널이 아닌 쪽에서 문제가 생겼다. 위젯을 추가하면 schema에는 들어가는데 화면에 안 보였다. 속성을 고치고 포커스를 빼면 값이 원래대로 돌아갔다.

원인은 registry 연결을 모듈 변수에 둔 데 있었다.

```ts title="core-store-before.ts"
// 모듈 스코프 — 앱 전체에 하나뿐
let registry: Registry | null = null;
export const connectRegistry = (r: Registry) => { registry = r; };

export const makeCoreStore = () =>
  createStore((set, get) => ({
    /* 액션들이 모듈 변수 registry 로 dual-write */
  }));
```

코어 store는 패널마다 따로 만들었다. 그런데 각 패널의 Provider가 마운트되면서 `connectRegistry`를 부르면 모듈 변수는 마지막에 마운트된 패널의 registry를 가리키게 된다. 그러면 다른 패널의 쓰기도 전부 그 registry로 갔고, 첫 번째 패널의 위젯 store는 갱신되지 않았다.

registry 연결과 관리 중인 노드 id 집합을 store를 만드는 함수의 클로저 안으로 옮겼다. 연결과 해제는 store 액션으로 내놓았다.

```ts title="core-store-after.ts"
export const makeCoreStore = () =>
  createStore((set, get) => {
    let registry: Registry | null = null; // 인스턴스마다 하나
    const managed = new Set<string>();

    return {
      actions: {
        connectRegistry: (r: Registry) => { registry = r; },
        disconnectRegistry: () => { registry = null; managed.clear(); },
        /* 다른 액션들은 같은 이름의 registry 를 그대로 쓴다 */
      },
    };
  });
```

내부에서 이 변수를 쓰던 곳이 20곳 가까이 됐지만, 변수 이름을 그대로 뒀기 때문에 손댈 필요가 없었다. Provider 쪽 브리지가 모듈 함수 대신 자기 인스턴스의 액션을 부르게 바꾼 것이 고친 내용의 전부다.

> [!NOTE]
> 단일 패널에서는 이 버그가 드러나지 않는다. 모듈 변수에 상태를 두는 코드는 인스턴스가 둘이 되는 경우를 가정하고 다시 읽어 봐야 한다.

## 남은 것

dual-write를 한 곳으로 모았지만 속성은 여전히 두 군데에 있다. 다음 단계로 생각한 것은 편집기용 위젯 store를 실제 store 대신 어댑터로 바꾸는 방안이다. `getState`는 schema의 노드 속성과 로컬 메서드를 합쳐 돌려주고, `setState`는 schema에 쓴다. 그러면 사본이 없어지고 동기화도 필요 없다.

다만 드래그와 리사이즈가 지나가는 경로라 조심스럽다. `getState`가 매번 새 객체를 만들면 `useShallow` 구독이 과하게 반응할 수 있고, 구독 경로도 한 단계 늘어난다. 앱에서 직접 만져 보며 확인해야 할 문제라 아직은 설계만 적어 두었다.

## 정리

- schema 하나로 직렬화, 메서드, 60fps 조건을 다 맞출 수 없어서 위젯마다 작은 store를 두었다.
- v4는 훅을 props 열 개로 넘겼다. v5는 registry, id 기반, scope 기반 세 층의 훅으로 나눠 props를 세 개로 줄였다.
- 액션마다 복사돼 있던 dual-write 8곳을, undo 스택의 patch를 읽어 동기화하는 함수 하나로 합쳤다.
- 메서드가 store 루트에 있어서 동기화는 merge로 해야 했다. replace는 메서드를 지운다.
- 모듈 변수에 둔 registry 때문에 쓰기가 마지막에 마운트된 패널로 몰렸다. store 클로저로 옮겨 인스턴스마다 갖게 했다.

다음 글은 이 구조 위에서 리렌더를 줄인 작업이다.
