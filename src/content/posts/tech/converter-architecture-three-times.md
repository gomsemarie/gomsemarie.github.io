---
title: "같은 도구를 세 번 다시 짰다: HTML 한 장에서 Electron과 서버까지"
description: "레거시 화면 스크립트를 고치는 룰 기반 변환 도구를 HTML 한 장, 크롬 확장, Electron과 서버 모노레포로 세 번 옮긴 기록이다. 옮길 때마다 무엇을 지키고 무엇을 갈랐는지 적는다."
date: 2026-10-17
category: "Tech/Node"
tags: ["electron", "fastify", "monorepo", "jscodeshift", "node"]
series: "사내 변환 도구 개발기"
seriesOrder: 1
---

## 무엇을 하는 도구인가

회사에서 쓰는 노코드 UI 빌더는 화면마다 스크립트를 붙인다. 예전 화면은 VB로, 새 화면은 JS로 쓴다. 옮기는 작업에는 자동 변환기가 이미 있었다. 다만 그 결과는 1차 변환이라 사람이 손봐야 하는 자리가 많았다. 선언이 빠진 변수, 인자 순서가 바뀐 메서드, JS에 없는 VB 상수 같은 것들이다.

이 도구는 그 1차 결과를 받아 기계적으로 고칠 수 있는 부분을 룰로 고친다. 룰은 jscodeshift로 AST를 만진다. 고친 결과는 diff로 보여 주고 사람이 확인한다. 자동으로 고칠 수 없는 자리는 마커만 찍는다.

이 시리즈는 그 도구를 만든 기록이다. 첫 글은 같은 도구를 세 번 다시 짠 이야기다. 작업 대부분은 AI 코딩 에이전트와 함께 했다.

## 첫 판: HTML 파일 하나

처음엔 빌드 없는 HTML이었다. Vanilla JS에 Monaco 에디터 하나만 썼다. 폐쇄망에서 돌아야 해서 의존성을 늘리고 싶지 않았다.

모드가 둘이었다. 변경점을 하나씩 보며 적용하거나 넘기는 스텝 모드, 룰을 고르면 그 룰의 대상을 전부 칠하고 한 번에 적용하는 룰 단위 모드다. 룰은 `RULES` 배열의 객체 하나였다. 룰을 추가하려면 객체를 하나 더 넣으면 됐다.

나흘 뒤 엔진을 다시 썼다. 스캐너와 스코프 해석을 넣어, 같은 이름이 함수 안에 있으면 그쪽을 먼저 보고 없으면 전역을 보게 했다. 화면은 diff 에디터 하나로 합쳤다. 두 모드는 지웠다. jQuery 같은 라이브러리는 CDN 대신 저장소에 넣었다. 폐쇄망에서는 CDN 요청이 나가지 않는다.

## 둘째 판: 크롬 확장

다음 판은 MV3 크롬 확장이었다. 여전히 빌드가 없었고, 폐쇄망 안에서 파일만 고쳐 룰과 화면을 바꿀 수 있었다.

엔진은 recast와 jscodeshift로 바꿨다. 문자열을 고치는 방식은 건드리지 않은 코드의 공백과 따옴표를 지키기 어렵다. recast는 바꾼 노드만 다시 찍기 때문에 나머지 서식이 그대로 남는다.

룰은 파일 하나에 하나씩 뒀다. 각 파일은 브라우저 스크립트다. 전역 레지스트리에 `register`를 부르고, 공용 AST 헬퍼를 전역에서 꺼내 쓴다. 로더가 목록 파일을 읽어 차례로 `<script>`처럼 올렸다. 배포는 공유폴더에 확장 사본을 두고 각자 복사해 가는 방식이었다.

## 셋째 판: Electron과 서버

폐쇄망 반입 조건이 바뀌었다. 실행 파일은 들일 수 있게 됐고, 원본 소스는 넣지 않기로 했다. 크롬 확장은 소스가 그대로 보이는 형태라 맞지 않았다.

그래서 Electron 클라이언트와 API 서버로 나눴다. 변환은 서버가 한다. 클라이언트는 화면과 로컬 입출력만 맡는다. 클립보드, 파일 열기, 창 관리 정도다. 판정 로직이 클라이언트에 한 줄이라도 있으면 그 로직은 소스와 함께 배포된다.

기존 확장은 지우지 않았다. 통째로 `archive/` 아래로 옮겨 그 안에서 혼자 돌게 했다. 새 판이 완성될 때까지 옛 동작을 바로 확인할 수 있어야 했다.

> [!NOTE]
> 렌더러 쪽에도 폐쇄망 사정이 있었다. 시안은 폰트와 아이콘을 CDN에서 불렀다. 폰트는 npm 패키지로 번들에 넣었고, CSP로 localhost 외의 요청을 막았다.

## 패키지 네 개로 경계를 그었다

서버 쪽은 pnpm 모노레포로 시작했다. 패키지는 넷이다.

- `domain`: 화면 필드 유사도 매칭, 그리드 정의 정규화 같은 실제 자산
- `engine`: 룰 실행
- `rules`: 룰 파일
- `contract`: 클라이언트와 서버가 같이 보는 Zod 스키마

요구가 둘이었다. 룰은 공개해도 된다. 현장에서 사람들이 읽고 고쳐야 하기 때문이다. 엔진과 도메인은 서버 번들 안에만 있어야 한다.

이 경계를 주석으로 적어 두면 언젠가 누가 import 한 줄로 넘는다. 그래서 의존성으로 막았다. `rules`와 `engine`은 `domain`을 의존성에 넣지 않는다. pnpm은 패키지마다 `node_modules`를 격리하므로, 선언하지 않은 패키지는 import 자체가 실패한다.

```json title="packages/rules/package.json"
{
  "name": "@app/rules",
  "//": "engine 을 의존하지 않는다. 룰은 워커가 깔아 주는 전역만 쓴다.",
  "devDependencies": {
    "typescript": "^5.9.2"
  }
}
```

도메인 코드를 TypeScript로 옮길 때는 동작을 고치지 않았다. 알려진 약점도 주석만 달고 뒀다. 포팅과 동작 변경을 섞으면 나중에 결과가 달라졌을 때 어느 쪽 탓인지 가릴 수 없다. 원본 JS를 vm에 올려 이식본과 출력을 대조했고, 5,359건에서 차이가 없었다.

## 룰 소스를 한 줄도 고치지 않고 옮겼다

`rules`가 `engine`에 의존하지 않으려면 룰이 엔진을 import하면 안 된다. 그런데 룰은 이미 브라우저 스크립트로 쓰여 있었다. 최상위 `var`, `window.X = ...`, 즉시 실행 함수를 쓴다.

`node:vm` 컨텍스트에 `window`를 자기 자신으로 걸면 브라우저와 같은 의미가 된다. 최상위 `var x`는 컨텍스트 객체의 속성이 되고, 그게 곧 `window.x`다. 파일끼리 전역을 공유하는 방식도 그대로다.

```ts title="load-rules.ts"
import vm from 'node:vm';

export function loadRuleFiles(files: { name: string; code: string }[]) {
  const registry = createRegistry();
  const ctx: Record<string, unknown> = {
    Rules: registry, // 룰이 register 를 부를 곳
    Ast: astHelpers, // 공용 AST 헬퍼
    console: captureConsole(),
  };
  // 브라우저처럼: 최상위 var 가 window.x 가 된다
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const failures: { name: string; reason: string }[] = [];
  for (const f of files) {
    try {
      vm.runInContext(f.code, ctx, { filename: f.name });
    } catch (e) {
      failures.push({ name: f.name, reason: String(e) });
    }
  }
  return { registry, failures };
}
```

엔진은 레지스트리와 헬퍼를 전역으로 깔아 줄 뿐이고, 룰은 그것만 본다. 그래서 룰 패키지는 엔진을 몰라도 된다. 룰은 컴파일도 번들도 하지 않고 원문으로 둔다. 서버가 실행 시점에 읽어야 폐쇄망에서 파일만 바꿔 고칠 수 있다.

옛 엔진과 새 엔진에 같은 소스를 넣어 92건을 비교했고 차이는 없었다. 대조하다 버그도 하나 찾았다. recast의 `lineTerminator` 기본값이 `os.EOL`이다. 브라우저에서는 늘 `\n`이었지만 Node에서는 Windows면 CRLF가 된다. 서버를 어느 OS에 올리느냐에 따라 diff의 모든 줄이 바뀐 것처럼 보인다. `\n`으로 고정했다.

## 새 PC에서 서버가 안 떴다

열흘쯤 지나 새 PC에서 저장소를 받았더니 `pnpm dev:api`가 바로 죽었다.

```text title="terminal"
Cannot find module '.../@app/rules/dist/index.js' imported from src/paths.ts
```

패키지의 `exports`는 전부 `dist/`를 가리킨다. `dist/`는 gitignore 대상이라 새로 받은 사람에게는 없다. `prepare` 스크립트가 설치 직후 패키지를 굽고 있었지만 `contract`와 `domain`만 굽고 있었다. 도메인이 같은 이유로 한 번 터져서 그때 추가한 것이었다. 같은 일이 `rules`에서 다시 났다.

한 패키지만 빠져도 같은 자리에서 걸린다. 그래서 이름을 나열하지 않고 필터를 넓혔다.

```json title="package.json"
{
  "scripts": {
    "prepare": "pnpm --filter \"./packages/*\" build",
    "dev:api": "pnpm --filter \"./packages/*\" build && pnpm --filter api dev"
  }
}
```

`dev:*`에도 같은 빌드를 붙였다. `install` 없이 `pull`만 한 경우에도 낡은 `dist`로 뜨지 않게 하려는 것이다.

> [!TIP]
> 원래 쓰던 PC에는 `dist`가 남아 있어서 이 문제가 보이지 않았다. 패키지 목록을 손으로 나열하는 스크립트는 새 패키지가 생기는 순간 틀어진다.

## 정리

- 단일 HTML, 크롬 확장, Electron과 서버로 세 번 옮겼다. 매번 바뀐 것은 반입 조건과 배포 방식이었다.
- 클라이언트는 화면과 로컬 입출력만 맡는다. 판정 로직은 서버에만 둔다.
- 공개할 것과 보호할 것은 주석이 아니라 패키지 의존성으로 갈랐다.
- vm 컨텍스트에 `window`를 자기 자신으로 걸어 브라우저용 룰을 수정 없이 서버에서 돌렸다.
- 포팅과 동작 변경을 섞지 않고, 옛 구현과 출력을 대조해 차이 0을 확인했다.
- 워크스페이스 패키지 빌드는 이름 나열 대신 `./packages/*` 필터로 건다.
