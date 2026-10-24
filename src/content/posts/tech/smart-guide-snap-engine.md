---
title: "노코드 UI 빌더 캔버스에 드래그 스냅 붙이기"
description: "캔버스에서 위젯을 끌 때 정렬선, 등간격, 거리 표시가 뜨도록 스냅 엔진을 만들었다. 형제 요소를 기준점으로 바꿔 축별로 비교하고, 등간격은 밴드 필터와 체인으로 찾았으며, 두 스냅이 겹치면 덜 움직이는 쪽을 고르게 했다."
date: 2026-03-27
category: "Tech/Editor"
tags: ["react", "editor", "algorithm", "typescript"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 2
---

회사에서 노코드 UI 빌더를 만들고 있다. 캔버스에 위젯을 끌어다 놓아 화면을 조립하는 도구다. 끌어다 놓는 것까지는 됐는데 줄을 맞추기가 어려웠다. 버튼 세 개를 나란히 놓으면 1~2px씩 어긋났고, 간격도 눈으로 맞춰야 했다.

Figma처럼 가장자리가 맞으면 선이 뜨고 간격이 같으면 숫자가 강조되는 기능이 필요했다. 처음 모듈은 내가 만들었고, 이후 동료와 함께 몇 차례 다듬었다. 아래는 그 엔진이 무엇을 어떻게 계산하는지, 그리고 쓰면서 고친 문제들이다.

## 요구사항

- **정렬 스냅**: 가장자리(상하좌우)나 중심선이 다른 요소와 가까우면 맞춘다.
- **등간격 스냅**: 형제들이 같은 간격으로 놓여 있으면 그 간격을 이어 가는 위치를 찾는다.
- **거리 표시**: 주변 요소와의 거리를 선과 숫자로 보여 준다.

비교 대상은 같은 부모 아래의 형제와 부모 컨테이너로 한정했다. 다른 프레임 안의 요소와 맞출 일은 거의 없었고, 범위를 좁히면 계산할 양도 줄어든다. 기본값은 감지 거리 100px, 흡착 거리 8px, 거리 표시 최대 50px, 등간격 허용 오차 3px로 잡았다.

## 계산 방식

### 드래그 한 번의 흐름

엔진은 드래그 시작, 이동, 종료 때만 움직인다. 시작할 때 부모의 자식 목록에서 형제를 꺼내고, 각 요소의 DOM 사각형을 읽어 인덱스에 넣는다. 부모 컨테이너도 특별한 ID로 함께 넣어서, 부모 가장자리와의 정렬이나 여백도 같은 코드로 계산되게 했다. 이동 중에는 현재 사각형을 넘겨 결과를 받고, 종료할 때는 결과와 인덱스를 비운다. 엔진 인스턴스는 React 상태 밖에 두고, 화면에 그릴 결과만 store에 올렸다.

### 요소를 기준점 6개로 바꾼다

정렬은 어떤 선과 어떤 선이 가까운지를 따지는 문제다. 그래서 요소 하나를 x축 기준점 3개(left, right, centerX)와 y축 기준점 3개(top, bottom, centerY)로 바꿨다.

```ts title="snap-points.ts"
type Axis = 'x' | 'y';
type PointType = 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY';

interface Rect { left: number; top: number; width: number; height: number }
interface SnapPoint { type: PointType; axis: Axis; value: number; id: string }

function toPoints(id: string, r: Rect): SnapPoint[] {
  return [
    { id, axis: 'x', type: 'left', value: r.left },
    { id, axis: 'x', type: 'right', value: r.left + r.width },
    { id, axis: 'x', type: 'centerX', value: r.left + r.width / 2 },
    { id, axis: 'y', type: 'top', value: r.top },
    { id, axis: 'y', type: 'bottom', value: r.top + r.height },
    { id, axis: 'y', type: 'centerY', value: r.top + r.height / 2 },
  ];
}
```

x축과 y축은 따로 계산한다. 가로로 맞는 선과 세로로 맞는 선은 서로 영향을 주지 않기 때문이다. 축마다 `min/max`, `crossMin/crossMax` 키를 바꿔 끼우는 매핑 함수를 하나 두고, 나머지 로직은 축과 상관없이 한 번만 썼다.

### 공간 인덱스는 단순하게 시작했다

드래그 중인 요소의 사각형을 감지 거리만큼 넓히고, 그것과 겹치는 요소만 후보로 뽑는다. AABB 겹침 검사다.

```ts title="spatial-index.ts"
interface Box { minX: number; minY: number; maxX: number; maxY: number; id: string }

class SimpleIndex {
  private map = new Map<string, Box>();
  private cache: Box[] | null = null;

  upsert(box: Box) { this.map.set(box.id, box); this.cache = null; }
  clear() { this.map.clear(); this.cache = null; }

  search(b: Box, pad: number): Box[] {
    const list = (this.cache ??= [...this.map.values()]);
    return list.filter(n =>
      n.maxX >= b.minX - pad && n.minX <= b.maxX + pad &&
      n.maxY >= b.minY - pad && n.minY <= b.maxY + pad,
    );
  }
}
```

R-Tree는 쓰지 않았다. 대상이 형제뿐이라 요소가 많지 않았고 선형 탐색으로 충분했다. 대신 인터페이스를 `upsert / search / clear`로 고정해 두었다. 요소가 100개를 넘는 화면이 생기면 rbush 같은 라이브러리로 바꿔 끼울 생각이다.

### 정렬선 고르기

후보가 정해지면 같은 축의 기준점끼리 전부 비교한다. 흡착 거리 안에서 가장 가까운 쌍을 고르고, 거리가 같으면 우선순위를 본다. 같은 종류끼리(left와 left)가 1순위, 가장자리끼리(left와 right)가 2순위, 가장자리와 중심선이 섞인 경우가 3순위다. 사용자는 대개 왼쪽 끝을 맞추겠다는 생각으로 끌기 때문에 같은 종류를 앞에 뒀다.

맞출 선을 찾으면 그 선을 요소의 left나 top 좌표로 되돌린다. right가 맞았으면 `선 위치 - 너비`, 중심선이 맞았으면 `선 위치 - 너비 / 2`다.

### 등간격은 체인으로 찾는다

첫 버전은 형제 전체의 이웃 간격을 모아 허용 오차 안에서 묶고, 가장 많이 나온 간격을 대표값으로 썼다. 그 값으로 "두 요소 사이", "맨 앞", "맨 뒤" 후보를 만들었다. 그런데 형제를 전부 한 줄로 세워 계산하다 보니 위아래 다른 줄의 간격까지 섞여 들어왔다.

그래서 먼저 **밴드 필터**를 건다. x축 등간격을 찾을 때는 드래그 요소와 세로 범위가 겹치는 형제만 남긴다. 그다음 드래그 요소 옆 요소를 씨앗으로 삼아, 같은 간격이 이어지는 동안 체인을 늘린다.

```ts title="equal-spacing.ts"
// sorted: 밴드 안의 형제를 x축 방향으로 정렬한 배열
function extendForward(sorted: Box[], startEdge: number, seedGap: number, tol: number) {
  const chain: Box[] = [];
  let edge = startEdge;
  let sum = 0;

  for (const n of sorted) {
    if (n.minX <= edge) continue;
    const gap = n.minX - edge;
    const target = chain.length ? sum / chain.length : seedGap;
    if (Math.abs(gap - target) > tol) continue;
    chain.push(n);
    sum += gap;
    edge = n.maxX;
  }
  return { chain, gap: chain.length ? sum / chain.length : seedGap };
}
```

후보를 만드는 경우는 세 가지다. 오른쪽 형제를 씨앗으로 오른쪽으로 늘리는 경우, 왼쪽 형제를 씨앗으로 왼쪽으로 늘리는 경우, 이웃한 두 형제 사이에 끼워 양쪽 여백을 같게 하는 경우다. 방향마다 씨앗은 가까운 쪽부터 3개까지만 보니, 계산량은 `씨앗 수 × 밴드 안 요소 수`를 넘지 않는다. 체인을 늘릴 때는 직전 요소와 교차축 범위가 겹치는지도 확인해서, 높이가 겹치지 않는 요소가 끼어들지 않게 했다.

### 두 스냅이 동시에 잡힐 때

한 축에서 정렬 스냅과 등간격 스냅이 동시에 잡힐 수 있다. 이때는 현재 위치에서 덜 움직이는 쪽을 골랐고, 거리가 같으면 등간격을 택했다. 등간격이 맞았다는 건 여러 요소와 관계가 맞는다는 뜻이어서 선 하나보다 정보가 많다고 봤다.

> [!NOTE]
> 우선순위 규칙을 더 늘리고 싶었지만 "덜 움직이는 쪽" 하나로 정리했다. 손을 뗀 위치에서 가장 가까운 답이 대개 사용자가 의도한 답이었다.

## 그리기

계산 결과는 캔버스 위 SVG 레이어로 그린다. 레이어는 캔버스와 같은 크기의 `position: fixed` 컨테이너이고, `pointer-events: none`으로 드래그를 방해하지 않게 했다. 정렬선은 파란 점선, 일반 거리는 빨간 선, 등간격은 초록 선과 굵은 숫자로 구분했다.

거리선은 교차축이 겹치는 형제에게만 그리고, 겹치는 구간의 가운데에 둔다. 처음에는 바깥 거리만 생각했는데, 요소가 다른 요소 안쪽에 들어가 있을 때도 거리가 필요했다. 그래서 edge 쌍을 바깥 두 가지와 안쪽 두 가지(왼쪽끼리, 오른쪽끼리)로 늘렸다.

## 쓰면서 고친 문제

### 스크롤하면 선이 어긋났다

위치는 `getBoundingClientRect()`로 읽은 화면 좌표다. 처음에는 드래그를 시작할 때 한 번만 인덱싱했는데, 드래그 도중 스크롤되면 좌표가 실제와 달라졌다. 지금은 계산할 때마다 형제 위치를 다시 읽는다. 스크롤이 있을 때만 다시 읽도록 줄일 여지는 남아 있다.

> [!WARNING]
> 화면 좌표로 인덱싱하면 스크롤, 줌, 패널 크기 변경이 모두 좌표를 바꾼다. 캐시를 언제 버릴지부터 정해 두는 편이 낫다.

### 거리 표시가 빠지거나 두 번 나왔다

맨 앞이나 맨 뒤에 놓는 등간격에서 거리선이 안 보였다. 등간격 결과의 요소 목록만 보고 그렸기 때문이다. 형제 전체를 보고 간격을 다시 계산하게 고쳤다. 같은 두 요소 사이에 선이 두 번 그려지는 경우도 있었는데, `from-to-axis` 키와 역방향 키를 Set에 넣어 걸렀다. 이 정리를 하면서 엔진 코드는 약 1,085줄에서 879줄로 줄었다.

### 거리선끼리 겹쳤다

형제가 여러 개면 같은 높이에 거리선이 포개졌다. 같은 축 선들을 교차축 위치 순으로 정렬해 10px씩 계단처럼 벌리고, 원래 위치에서 20px 이상은 벗어나지 않게 막았다. 등간격 선은 반대로 체인 전체의 교차축 겹침 구간 가운데에 모아 일직선으로 보이게 했다.

### 무조건 붙으면 불편했다

흡착 거리 안에 들어가면 바로 붙게 했더니 미세 조정이 어려웠다. 지금은 Shift를 누르면 가이드만 보이고, Shift와 Ctrl을 함께 누르면 보정된 위치로 붙는다. 키 조합은 아직 정하는 중이다. 드래그 이벤트는 60fps로 제한하고 `requestAnimationFrame` 안에서 위치를 갱신한다.

> [!TIP]
> 엔진은 어디에 붙을 수 있는지만 돌려주고, 실제로 붙일지는 호출하는 쪽이 정하게 했다. 그래서 키 정책을 바꿀 때 엔진 코드는 손대지 않았다.

## 마치며

- 요소를 기준점 6개로 바꾸고 축을 나누니, 정렬은 1차원에서 가까운 값을 찾는 문제로 바뀌었다.
- 공간 인덱스는 선형 탐색으로 시작했다. 인터페이스를 고정해 두었으니 나중에 바꾸기 어렵지 않을 것으로 본다.
- 등간격을 대표 간격 하나로 풀었을 때는 다른 줄 요소가 섞였고, 밴드 필터와 체인 방식으로 바꿔 해결했다.
- 두 스냅이 부딪히면 덜 움직이는 쪽을 고른다. 규칙이 하나뿐이라 사용자가 결과를 예상하기 쉽다.
- 그리는 쪽에도 계산만큼 손이 갔다. 좌표 기준, 중복, 겹침 문제를 하나씩 따로 고쳤다.

여러 요소를 함께 끌 때의 스냅, 회전된 요소, 그리드 스냅은 아직 없다. 요소가 많아지면 인덱스를 교체하고 계산을 Web Worker로 옮기는 것도 검토하려 한다.
