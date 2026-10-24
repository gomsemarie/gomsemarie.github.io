---
title: "슬롯 PoC를 하루 만에 되돌리고 slots-as-root로 다시 만들었다"
description: "위젯 안 원하는 위치에 자식을 넣는 슬롯을 기존 모델 위에 얹었더니 드롭 좌표가 어긋나고 자식 목록이 두 벌이 됐다. PoC를 되돌리고 자식 목록을 slots 하나로 합쳤으며, 좌표 기준 요소는 빌더가 렌더하는 래퍼로 고정했다."
date: 2026-05-14
category: "Tech/Editor"
tags: ["react", "editor", "data-model", "drag-and-drop", "typescript"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 5
---

회사에서 만드는 노코드 UI 빌더에는 자식을 가질 수 있는 위젯이 있다. Frame이나 Form 같은 컨테이너다. 처음 구조는 단순했다. 빌더가 위젯 본체를 그리고, 그 옆에 자식들을 자동으로 붙였다. 자식은 언제나 위젯 박스 바로 안쪽에 들어갔다.

Tab 위젯을 만들려고 하자 이 방식이 맞지 않았다. 탭에는 헤더가 있고 패널이 여러 개 있다. 자식은 헤더가 아닌 각 패널 안에 들어가야 한다. 위젯 코드가 자식을 그릴 위치를 직접 지정할 수 있어야 했다. 이 기능을 슬롯이라고 불렀다.

슬롯은 PoC로 먼저 만들었다가 하루 만에 되돌렸고, 데이터 모델부터 다시 짰다.

## PoC: 기존 모델 위에 슬롯을 얹었다

첫 시도는 기존 구조를 최대한 건드리지 않는 쪽이었다. 커밋 네 개로 나눠 하루 동안 만들었다.

- 노드에 `slotId` 필드를 추가했다. 없으면 `'default'` 슬롯이다.
- 기존 `childrenIds`는 그대로 두고, 여기서 슬롯별 그룹인 `slotChildrenIds`를 파생해서 만들었다.
- 위젯 JSX 안에 넣는 `SlotMarker` 같은 마커 컴포넌트를 만들었다.
- 스토어 액션(삽입, 이동)에 `slotId` 옵션과 슬롯 안 순서를 바꾸는 액션을 추가했다.
- 인스펙터에 슬롯 관리 섹션(추가, 위아래 이동, 삭제)을 붙였다.
- 검증용으로 Tab 위젯을 만들었다.

```ts title="poc-model.ts"
// PoC 당시 모델: 원본과 파생 데이터가 함께 있다
type NodeBase = {
  id: string;
  parentId: string | null;
  childrenIds: string[];                      // 원본
  slotChildrenIds: Record<string, string[]>;  // childrenIds + 각 자식의 slotId로 파생
  slotId?: string;
};
```

새 옵션은 모두 optional로 둬서 기존 호출부는 영향을 받지 않았다. 여기까지는 잘 돌아가는 것처럼 보였다. Tab 위젯에 패널을 추가하고 그 안에 버튼을 떨어뜨리는 것까지 됐다.

## 드래그 좌표가 어긋났다

문제는 자식을 패널 안에서 끌어 옮길 때 드러났다.

빌더 캔버스의 위젯은 `position: absolute`와 `x`, `y` 좌표로 배치된다. 드롭할 때는 부모 노드의 화면상 사각형을 기준으로 상대 좌표를 계산한다. 이 계산이 맞으려면 좌표를 계산한 기준 요소와 CSS가 실제로 absolute 위치를 잡는 기준 요소가 같아야 한다.

슬롯 마커는 위젯 JSX의 아무 위치에나 놓일 수 있었다. 그러면 자식과 위젯 박스 사이에 위젯 작성자가 만든 div가 여러 겹 끼어든다. 이 div 중 하나에 `position: relative`가 있으면 absolute 자식의 기준이 그 div로 바뀐다. `transform`이 걸려 있으면 그 요소가 containing block이 되고, 좌표 자체도 변형된다. 빌더는 부모 노드 사각형으로 계산했는데 브라우저는 다른 요소를 기준으로 그렸고, 그 차이만큼 드롭 위치가 밀렸다.

> [!WARNING]
> `position: absolute`의 기준은 가장 가까운 positioned 조상이다. `transform`, `filter`, `will-change: transform` 같은 속성도 새 containing block을 만든다. 위젯 작성자가 스타일을 자유롭게 쓰는 구조라면 빌더가 좌표 계산의 기준 요소를 직접 통제해야 한다.

패치로 막을 수도 있었다. 그런데 원인을 따라가 보니 문제가 하나 더 있었다.

## 두 개념이 공존하는 모델

PoC 모델에는 자식 목록이 사실상 두 개였다. `childrenIds`가 원본이고 `slotChildrenIds`는 파생이다. 삽입, 이동, 삭제, 복제 같은 모든 액션이 두 구조를 같이 맞춰야 했다. 파생 쪽은 트리를 다시 만들 때 재계산했지만, 어느 쪽이 기준인지를 매번 따져야 했다. 슬롯 안 순서를 바꾸는 액션은 다른 슬롯 자식의 순서를 보존하려고 `childrenIds` 안에서 위치를 계산해야 했다.

슬롯 관리 UI도 자리가 맞지 않았다. 인스펙터에 넣었지만, 탭 편집은 별도 창에서 하는 편이 낫겠다는 판단이 나왔다.

문제를 모아 보면 이랬다.

1. 위젯 JSX 임의 위치에서 렌더하면 좌표 기준을 통제할 수 없다.
2. `children`과 `slot` 두 개념이 함께 있어서 데이터 모델이 복잡하다.
3. 슬롯 관리 UI는 인스펙터에서 별도 편집기로 옮길 예정이다.

데이터 모델을 바꿀 생각이라면 PoC 위에 덧대기보다 지우고 다시 쓰는 편이 깔끔했다. 그래서 네 커밋을 한 번에 되돌렸다. 되돌린 커밋 메시지에는 폐기 대상과 이유를 적어 뒀다. 나중에 왜 이렇게 바뀌었는지 찾을 때 이 메시지가 가장 빨리 답을 줬다.

## slots-as-root: 자식 목록을 하나로

재설계에서는 먼저 `childrenIds`를 없앴다. 모든 자식은 어떤 슬롯에 속한다. 슬롯을 지정하지 않은 자식은 `'default'` 슬롯에 들어간다. 슬롯이 원본이고, 전체 자식 목록이 필요하면 슬롯을 평탄화한다.

```ts title="node-model.ts"
type NodeBase = {
  id: string;
  parentId: string | null;
  // 슬롯별 자식 ID. 단일 children 배열은 없다
  slots: Record<string, string[]>;
  // 내가 부모의 어느 슬롯에 있는지. 없으면 'default'
  slotId?: string;
};

// 기존 코드를 위한 호환 헬퍼: 슬롯 키 순서 → 슬롯 안 순서대로 평탄화
export function getAllChildIds(node: Pick<NodeBase, 'slots'>): string[] {
  const all: string[] = [];
  for (const key in node.slots) all.push(...node.slots[key]);
  return all;
}
```

트리 구조를 쓰던 아웃라이너 같은 곳은 호환 헬퍼로 옮겼다. 삽입, 이동, 삭제, 복제는 모두 슬롯을 순회하도록 바꿨다. 스냅 모듈처럼 자식 목록을 읽던 곳도 같이 고쳤다.

### 저장 형식은 바꾸지 않았다

메모리 모델은 바꿨지만 저장 파일 형식은 그대로 뒀다. 파일에는 예전처럼 `children` 배열이 있고, 각 자식이 `slotId`를 갖는다. 불러올 때 슬롯별로 묶고, 저장할 때 다시 풀어서 하나의 배열로 쓴다.

```ts title="normalize.ts"
type SavedNode = { type: string; props: Record<string, unknown>; children: SavedNode[]; slotId?: string };

// 저장 형식(children + slotId) → 메모리 형식(slots)
function normalize(root: SavedNode, newId: () => string) {
  const nodes: Record<string, NodeBase & Omit<SavedNode, 'children'>> = {};
  const walk = (node: SavedNode, id: string, parentId: string | null) => {
    const { children, ...rest } = node;
    const slots: Record<string, string[]> = {};
    nodes[id] = { ...rest, id, parentId, slots };
    for (const child of children) {
      const childId = newId();
      (slots[child.slotId ?? 'default'] ??= []).push(childId);
      walk(child, childId, id);
    }
  };
  const rootId = newId();
  walk(root, rootId, null);
  return { rootId, nodes };
}
```

이미 저장된 화면 파일은 손대지 않아도 열렸다. 대신 파일에 스키마 버전 필드를 추가했다. 이번 변경은 "버전 1"로 표시만 하고 구조는 같다. 이 버전 필드가 이후 여러 번의 구조 변경을 받아 냈다. 그 내용은 다음 글에 쓴다.

### 좌표 기준 요소를 빌더가 갖는다

슬롯 마커는 여전히 위젯 JSX 안에 들어간다. 달라진 점은 마커가 빌더 소유의 래퍼 div를 렌더한다는 데 있다. 이 래퍼가 자식들의 직접 DOM 부모이자 좌표 기준이 된다.

```tsx title="slot.tsx"
export const Slot = memo(({ slotId = 'default' }: { slotId?: string }) => {
  const parentId = useContext(ParentIdContext);
  const childIds = useSlotChildren(parentId, slotId);
  const ref = useRef<HTMLDivElement>(null);

  // 드롭 타깃 등록: 떨어뜨리면 이 슬롯 ID가 자동으로 붙는다
  useEffect(() => {
    if (!ref.current || !parentId) return;
    return registerDropTarget(ref.current, { kind: 'slot', parentId, slotId });
  }, [parentId, slotId]);

  return (
    // 기준 요소를 빌더가 고정한다
    <div ref={ref} data-slot-id={slotId} className="relative" style={{ transform: 'none' }}>
      {childIds.map((id) => <CanvasElement key={id} nodeId={id} />)}
    </div>
  );
});
```

드롭 계산도 이 래퍼 기준으로 바꿨다. 드래그 라이브러리가 넘겨 주는 가장 가까운 드롭 타깃이 슬롯 래퍼이면, 그 요소의 사각형으로 상대 좌표를 낸다. 계산 기준과 렌더 기준이 같은 요소가 됐다.

래퍼 바깥, 즉 위젯 작성자가 만든 조상 div에 `transform`이 걸리면 여전히 위험하다. 코드로 막을 방법이 없어서 개발 모드에서만 조상을 거슬러 올라가며 검사하고 경고를 남겼다.

재설계 직후에는 슬롯을 정의하지 않은 기존 위젯에 대해 예전처럼 빌더가 자식을 자동으로 붙였다. Frame, Form 같은 위젯을 한꺼번에 고치지 않아도 됐다.

## 다시 만든 뒤에 생긴 일

재설계 후에도 몇 가지를 더 고쳤다.

- 노드를 다른 부모로 옮길 때 `slotId`를 갱신하지 않아서 자식이 두 슬롯에 중복 등록되는 버그가 있었다.
- 아웃라이너에 실제 스키마에 없는 "가상 슬롯 노드"를 끼워 넣는 방식을 시도했다. 공통 트리 컴포넌트에 빌더 전용 개념이 섞이는 게 마음에 들지 않아 되돌렸고, 자식 행 옆에 슬롯 이름을 표시하는 방식으로 단순하게 바꿨다.
- 탭 편집은 계획대로 별도 창 편집기로 옮겼다.

## 하루 뒤에 쓴 자체 검토

관련 커밋이 30개쯤 쌓였을 때 검토 문서를 따로 썼다. 남은 코드, 위젯 개발자 입장의 사용성, 기존 렌더 최적화 보존 여부, 위험 요소를 항목별로 봤다. 눈에 띈 것은 이랬다.

- **부모의 position 누락.** 슬롯 래퍼는 바로 위 positioned 조상을 기준으로 펼쳐진다. 위젯 작성자가 슬롯을 감싼 div에 `relative`를 빠뜨리면 더 바깥 요소 기준으로 어긋난다. 개발 모드 검사는 `transform`만 보고 있었다. `position: static`도 검사하자는 권장이 나왔다.
- **변환 규칙 누락.** 뷰어 쪽은 화면을 TSX로 변환해 실행한다. 변환기가 자식을 슬롯별로 감싸 주지 않으면 다중 슬롯 위젯의 자식이 모두 기본 슬롯으로 들어가 패널이 나뉘지 않는다. 위험도가 가장 높다고 본 항목이다.
- **컴포넌트 동일성 비교.** 뷰어에서 자식을 슬롯별로 나눌 때 `child.type === SlotItem`으로 비교했다. 같은 모듈 인스턴스라면 안전하지만, 빌드 과정에서 모듈이 중복되면 비교가 실패한다. `displayName`을 함께 보는 대안을 적어 뒀다.
- **쓰지 않는 구조 분해.** 슬롯으로 통일하면서 쓰이지 않게 된 옵션이 구조 분해 패턴 안에 남아 있었다. 타입 검사가 잡지 않는 종류라 눈으로 찾았다.

```ts title="slot-dev-check.ts"
// 검토에서 권장한 개발 모드 검사: 래퍼 바로 위 부모가 positioned인지
if (process.env.NODE_ENV !== 'production') {
  const parent = wrapper.parentElement;
  if (parent && getComputedStyle(parent).position === 'static') {
    console.warn('[Slot] 부모 요소가 static이다. relative 또는 absolute가 필요하다.');
  }
}
```

> [!TIP]
> 구조를 크게 바꾼 뒤에는 남은 코드, 쓰는 사람 입장, 기존 최적화, 위험처럼 관점을 나눠서 검토하면 빠진 곳이 잘 보였다. 기존 최적화가 유지됐는지는 따로 확인하지 않으면 놓치기 쉽다.

검토 결과는 대체로 긍정적이었다. 저장 형식, 메모리 모델, 변환 결과가 1:1로 대응하고, 예전 이중 자식 구조에서 생기던 히트 테스트 버그는 구조상 더 생길 수 없게 됐다. 남은 일은 변환 규칙과 positioned 조상 검사였다.

## 정리

- 기존 모델에 덧대는 PoC는 빨리 만들 수 있지만, 원본과 파생 데이터가 함께 있으면 모든 액션이 둘을 맞춰야 한다.
- 위젯 코드 안 임의 위치에 자식을 그리면 absolute 좌표의 기준 요소를 빌더가 통제하지 못한다. 기준 요소는 빌더가 직접 렌더하게 했다.
- 데이터 모델을 바꾸기로 하고 PoC를 되돌린 뒤 다시 썼다. 되돌리는 커밋에 이유를 남겼다.
- 자식 목록을 `slots: Record<string, string[]>` 하나로 합치고, 저장 형식은 `children + slotId` 그대로 둬서 기존 파일을 고치지 않았다.
- 구조 변경 뒤에는 관점을 나눠 자체 검토를 했다. 위험이 큰 항목은 변환 규칙과 positioned 조상 검사였다.
