---
title: "IDE 바닥에 사는 펫 만들기"
description: "Electron IDE에 status bar를 바닥 삼아 걸어 다니는 펫을 넣었다. 던지기 물리, backtick을 누르고 있으면 뜨는 방사형 메뉴, 그 뒤에 그린 작은 게임 제작 키트 로드맵을 정리했다."
date: 2026-10-17
category: "Tech/React"
tags: ["react", "phaser", "easter-egg", "game-physics", "electron"]
series: "Electron IDE 개발기"
seriesOrder: 6
---

IDE에 쓸모없는 것을 하나 넣었다. 화면 아래쪽을 걸어 다니는 펫이다. 이름은 Dev Friend로 붙였다. 밥을 주고, 놀아 주고, 재울 수 있다. 일에는 도움이 안 된다. 작업은 AI 코딩 에이전트와 함께 했다.

## 바닥은 status bar다

펫은 IDE 위에 투명한 Phaser 캔버스를 깔고 그린다. 처음에는 화면 아래 48px을 바닥으로 잡았다. 그러면 펫이 status bar 위에 겹쳐 서 있었다. 그래서 바닥을 status bar 윗변으로 바꿨다.

바닥 위치는 DOM에서 읽는다. 매 프레임 `getBoundingClientRect`를 부르기는 아까워서 250ms마다 한 번만 읽고 나머지는 캐시를 쓴다. status bar가 없으면 원래대로 화면 아래 여백을 쓴다.

## 던지면 날아간다

마우스로 펫을 집어 끌 수 있다. 놓으면 그 자리에서 떨어지기만 해서 심심했다. 그래서 던질 수 있게 했다.

드래그 중에 직전 위치와 시각을 기억해 두고, 놓는 순간의 속도를 그대로 넘긴다. 그다음은 포물선이다.

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

속도는 1800px/s로 자른다. 마우스를 세게 휘두르면 화면 밖으로 사라지기 때문이다. 바닥에서 몇 번 통통 튀다가 미끄러지며 멈추는 정도가 적당했다. 숫자는 눈으로 보며 맞췄다.

## backtick을 누르고 있으면 메뉴가 뜬다

펫에게 밥을 주려고 command palette를 열고 명령을 치는 건 번거로웠다. 그래서 게임에서 흔히 쓰는 방사형 메뉴를 붙였다. backtick(`` ` ``)을 180ms 넘게 누르고 있으면 커서 자리에 원형 메뉴가 펼쳐진다. 마우스를 원하는 방향으로 움직이고 키를 떼면 실행된다. 짧게 톡 치면 아무 일도 없다.

안쪽 링은 늘 4개다. 도움말, 파일 찾기, 펫 켜기/끄기, Playground다. 펫이 켜져 있으면 바깥 링이 하나 더 생기고 먹이, 놀기, 재우기, 캐릭터, 설정이 붙는다. 진입점을 하나로 모으려고 command palette에 있던 펫 켜기/끄기 명령은 지웠다.

> [!NOTE]
> 한글 입력 상태에서는 `KeyboardEvent.key`가 `'Process'`로 와서 backtick과 매칭되지 않는다. 문자 키를 트리거로 쓸 때는 물리 키인 `e.code === 'Backquote'`로 함께 비교했다.

## 게임 제작 키트 로드맵

펫 스프라이트를 그리려고 IDE 안에 픽셀 아트 스프라이트 에디터를 만들었다. 만들고 나니 욕심이 생겨 로드맵을 적었다. 원칙은 "제한적이지만 쓰기 쉽게"였다. 모든 게임을 다루는 도구가 아니라 이스터에그 정도의 작은 게임에 충분한 도구다.

순서는 스프라이트 에디터, 타일맵 에디터, 데이터 테이블, 그다음 FSM 디자이너였다. 캐릭터 AI는 Behavior Tree 대신 FSM으로 정했다. 상태가 몇 개면 충분하고, 상태 이름을 스프라이트 애니메이션 키에 그대로 붙일 수 있기 때문이다.

타일맵 에디터는 실제로 만들었다. 레이어, undo, 애니메이션 타일, 쿼터뷰까지 붙였다. 그런데 결국 전부 지웠다. 스프라이트의 프레임 하나를 타일 하나로 쓰는 모델이 문제였다. 일반적인 타일맵 도구의 Tile 개념과 거리가 멀었고, 자동 타일이나 데이터 레이어를 얹을 자리가 없었다. 구조를 다시 짜는 계획까지 세웠다가, 진행하기 전에 접었다. 히스토리는 그대로 남겼다.

## 정리

- 펫의 바닥을 status bar 윗변으로 잡았다. DOM 읽기는 250ms 캐시로 줄였다.
- 놓는 순간의 드래그 속도를 넘기고 중력, 벽 반발, 바닥 반발, 마찰을 걸어 던지기를 만들었다.
- backtick을 누르고 있으면 뜨는 방사형 메뉴로 펫 조작을 옮겼다. 한글 IME 때문에 `e.code`로 매칭했다.
- 게임 제작 키트 로드맵에서 타일맵 에디터는 만들었다가 모델이 맞지 않아 지웠다.
