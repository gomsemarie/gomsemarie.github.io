---
title: "IDE 바닥을 걸어 다니는 펫 만들기"
description: "Electron IDE의 status bar 윗변을 바닥 삼아 걸어 다니는 펫을 넣었다. 놓는 순간의 드래그 속도로 던지기 물리를 만들고, backtick을 누르고 있으면 뜨는 방사형 메뉴로 조작을 모았으며, 그 뒤에 세운 게임 제작 키트 계획에서 타일맵 에디터는 만들었다가 지웠다."
date: 2026-06-05
category: "Tech/React"
tags: ["react", "phaser", "easter-egg", "game-physics", "electron"]
series: "Electron IDE 개발기"
seriesOrder: 6
---

IDE에 쓸모없는 것을 하나 넣었다. 화면 아래쪽을 걸어 다니는 펫이고, 이름은 Dev Friend로 붙였다. 밥을 주고, 놀아 주고, 재울 수 있다. 일에는 도움이 되지 않는다.

## 바닥은 status bar다

펫은 IDE 위에 투명한 Phaser 캔버스를 깔고 그 위에 그린다. 처음에는 화면 아래 48px을 바닥으로 잡았는데, 그러면 펫이 status bar 위에 겹쳐 서 있었다. 그래서 바닥을 status bar 윗변으로 바꿨다.

바닥 위치는 DOM에서 읽는다. 매 프레임 `getBoundingClientRect`를 부르기는 아까워서 250ms마다 한 번만 읽고 그사이에는 캐시한 값을 쓴다. status bar가 없으면 원래대로 화면 아래 여백을 바닥으로 쓴다.

## 던지면 날아간다

마우스로 펫을 집어 끌 수 있다. 처음에는 놓으면 그 자리에서 떨어지기만 해서 심심했고, 던질 수 있게 바꿨다.

드래그 중에 직전 위치와 시각을 기억해 두었다가, 놓는 순간의 속도를 그대로 넘긴다. 그 뒤로는 포물선을 그린다.

```ts title="throw-physics.ts"
const GRAVITY = 1600;      // px/s²
const WALL_BOUNCE = 0.5;
const FLOOR_BOUNCE = 0.42;
const MIN_BOUNCE_VY = 220; // 이보다 느리면 더 튀지 않는다
const FRICTION = 0.82;     // 바닥에 닿을 때마다 vx에 곱한다

function step(p: { x: number; y: number; vx: number; vy: number }, dt: number, floor: number, maxX: number) {
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x < 0 || p.x > maxX) {
    p.x = Math.max(0, Math.min(maxX, p.x));
    p.vx = -p.vx * WALL_BOUNCE;
  }
  if (p.y >= floor) {
    p.y = floor;
    p.vy = p.vy > MIN_BOUNCE_VY ? -p.vy * FLOOR_BOUNCE : 0;
    p.vx *= FRICTION;
  }
  return Math.abs(p.vx) < 8 && p.vy === 0; // true면 착지, idle로
}
```

속도는 1800px/s에서 자른다. 마우스를 세게 휘두르면 펫이 화면 밖으로 사라지기 때문이다. 바닥에서 몇 번 통통 튀다가 미끄러지며 멈추는 정도로 맞췄고, 숫자는 눈으로 보면서 정했다.

## backtick을 누르고 있으면 메뉴가 뜬다

펫에게 밥을 주려고 command palette를 열어 명령을 치는 건 번거로웠다. 그래서 게임에서 흔히 쓰는 방사형 메뉴를 붙였다. backtick(`` ` ``)을 180ms 넘게 누르고 있으면 커서 자리에 원형 메뉴가 펼쳐지고, 마우스를 원하는 방향으로 움직인 뒤 키를 떼면 그 항목이 실행된다. 짧게 톡 치면 아무 일도 일어나지 않는다.

안쪽 링에는 늘 도움말, 파일 찾기, 펫 켜기/끄기, Playground 네 개가 있다. 펫이 켜져 있으면 바깥 링이 하나 더 생기고 먹이, 놀기, 재우기, 캐릭터, 설정이 붙는다. 진입점을 한곳으로 모으려고 command palette에 있던 펫 켜기/끄기 명령은 지웠다.

> [!NOTE]
> 한글 입력 상태에서는 `KeyboardEvent.key`가 `'Process'`로 와서 backtick과 매칭되지 않는다. 문자 키를 트리거로 쓸 때는 물리 키인 `e.code === 'Backquote'`도 함께 비교했다.

## 게임 제작 키트 계획

펫 스프라이트를 그리려고 IDE 안에 픽셀 아트 스프라이트 에디터를 만들었다. 만들고 나니 욕심이 생겨 다음 계획을 적었다. 기준은 "기능은 제한적이어도 쓰기 쉽게"였다. 모든 게임을 만드는 도구가 아니라 이스터에그 정도의 작은 게임을 만들 수 있으면 충분했다.

순서는 스프라이트 에디터, 타일맵 에디터, 데이터 테이블, FSM 디자이너로 잡았다. 캐릭터 AI는 Behavior Tree 대신 FSM으로 정했다. 상태가 몇 개면 충분하고, 상태 이름을 스프라이트 애니메이션 키에 그대로 붙일 수 있어서다.

타일맵 에디터는 실제로 만들었다. 레이어, undo, 애니메이션 타일, 쿼터뷰까지 붙였지만 결국 전부 지웠다. 스프라이트의 프레임 하나를 타일 하나로 쓰는 모델이 문제였다. 일반적인 타일맵 도구의 Tile 개념과 거리가 멀었고, 자동 타일이나 데이터 레이어를 얹을 자리가 없었다. 구조를 다시 짜는 계획까지 세웠다가 진행하기 전에 접었다. 히스토리는 그대로 남겨 두었다.

## 정리

- 펫의 바닥을 status bar 윗변으로 잡고, DOM 읽기는 250ms 캐시로 줄였다.
- 놓는 순간의 드래그 속도를 넘기고 중력, 벽 반발, 바닥 반발, 마찰을 걸어 던지기를 만들었다.
- 펫 조작은 backtick을 누르고 있으면 뜨는 방사형 메뉴로 옮겼다. 한글 IME 때문에 `e.code`로도 매칭했다.
- 게임 제작 키트 계획 중 타일맵 에디터는 만들었다가 모델이 맞지 않아 지웠다.
