---
title: "`: any` 240개는 게으름 탓이 아니었다: AST 노드 타입을 판별 합집합으로 다시 쓰기"
description: "룰 코드에 쌓인 : any 240개의 원인은 편집기와 타입 검사의 strict 불일치, 그리고 type이 string이라 좁혀지지 않는 노드 타입이었다. 노드를 type으로 갈리는 닫힌 합집합으로 다시 적고, 계약과 런타임이 어긋난 자리를 함께 고쳤다."
date: 2026-10-17
category: "Tech/TypeScript"
tags: ["typescript", "discriminated-union", "monaco-editor", "jscodeshift", "type-safety"]
series: "사내 변환 도구 개발기"
seriesOrder: 8
---

## "타입 추론이 안 된다"

변환 룰은 jscodeshift로 구문 나무를 고치는 TypeScript 파일이다. 관리 화면의 Monaco 편집기에서 바로 쓰고, 룰이 쓰는 API는 선언 파일 하나에 계약으로 적어 두었다. 룰을 쓰는 사람들에게서 "타입 추론이 안 된다"는 말이 자주 나왔다.

번들 룰 폴더만 세어 보니 `: any`가 240개, `as any`가 4개 있었다. `: any`를 붙이는 순간 그 변수에서는 자동완성과 호버가 동작하지 않는다. "추론이 안 된다"던 것의 정체가 이것이었다. 계약을 만들어 놓고 계약이 스스로를 꺼 버린 셈이다.

이 글은 그 원인 두 가지와 고친 방법을 정리한 것이다. 작업은 AI 코딩 에이전트와 함께 했다.

## 원인 1: 편집기와 타입 검사가 서로 다른 규칙을 봤다

룰 편집기의 TypeScript 언어 서비스는 `strict: false`였고, 저장소의 `typecheck`는 `strict: true`였다. 그래서 편집기에서는 조용한데 터미널에서는 오류가 나는 코드가 생겼다. 두 곳을 한 번에 조용하게 만드는 가장 쉬운 방법이 `: any`였다.

```ts title="rule-editor-setup.ts"
typescriptDefaults.setCompilerOptions({
  target: ScriptTarget.ES2020,
  allowJs: true,
  // 룰 폴더 tsconfig.json 과 같은 값이어야 한다.
  // 한동안 여기만 false 였다
  strict: true,
});
```

편집기를 `strict: true`로 올리는 건 마지막에 했다. 그 전에 `: any`가 왜 필요했는지부터 풀어야 했다.

## 원인 2: 모든 멤버가 optional인 노드 타입

계약에 적힌 노드 타입은 이런 모양이었다.

```ts title="ast.d.ts (고치기 전)"
interface AstNode {
  type: string;
  name?: string;
  value?: LiteralValue | AstNode;
  callee?: AstNode;
  arguments?: AstNode[];
  object?: AstNode;
  property?: AstNode;
  left?: AstNode;
  right?: AstNode;
  operator?: string;
  declarations?: AstNode[];
  // ... 종류마다 있을 수 있는 멤버를 전부 optional로
}
```

주석에는 이렇게 설계한 이유가 적혀 있었다. 한 자리에 여러 종류의 노드가 올 수 있으니 종류마다 인터페이스를 나누면 룰이 매번 좁히기를 해야 하고, 그래서 룰은 `if (x.type === 'Identifier')`로 필요한 자리에서만 좁힌다는 것이다.

그 좁히기는 실제로 일어나지 않았다. `type`이 그냥 `string`이면 `===` 비교로는 아무것도 좁혀지지 않는다. 종류별 인터페이스를 몇 개 두어서 한 겹은 필수로 올려 줬지만, 그다음 겹은 다시 `AstNode | undefined`였다. 그런데 룰은 거의 항상 두세 겹을 파고든다.

```ts title="rule-example.ts"
root.find(j.CallExpression).forEach((p) => {
  const c = p.node.callee;
  if (c.type === "MemberExpression") {
    // type 이 string 이라 c 는 여전히 AstNode 다
    c.object.name;   // object 가 undefined 일 수 있다
  }
});
```

여기서 `: any`를 붙이면 오류가 사라진다. 그렇게 240개가 쌓였다.

## type으로 갈리는 닫힌 합집합

노드 타입을 `type` 리터럴로 갈리는 합집합으로 다시 적었다. 각 종류는 그 종류라면 반드시 있는 멤버를 필수로 갖는다.

```ts title="ast.d.ts (고친 뒤)"
/** 어느 노드에나 붙는 것. 합집합의 갈래가 아니다 */
interface NodeBase {
  loc?: Loc | null;
  extra?: { raw?: string; [key: string]: unknown };
}

interface Identifier extends NodeBase { type: "Identifier"; name: string }
interface Literal extends NodeBase { type: "Literal"; value: LiteralValue }
interface MemberExpression extends NodeBase {
  type: "MemberExpression";
  object: AstNode;
  property: AstNode;
  computed: boolean;
}
interface CallExpression extends NodeBase { type: "CallExpression"; callee: AstNode; arguments: AstNode[] }
interface SequenceExpression extends NodeBase { type: "SequenceExpression"; expressions: AstNode[] }
// ... 룰이 실제로 만지는 종류들

/** 따로 적지 않은 종류. 이름은 전부 나열한다 */
type OtherType =
  | "IfStatement" | "ForStatement" | "ThisExpression" | "TemplateLiteral"
  | "StringLiteral" | "NumericLiteral" /* ... */;
interface OtherNode extends NodeBase {
  type: OtherType;
  name?: string;
  callee?: AstNode;
  // 있을 만한 멤버를 optional로 연다
}

type AstNode = Identifier | Literal | MemberExpression | CallExpression | SequenceExpression | OtherNode /* ... */;
```

핵심은 `OtherNode`의 `type`도 `string`이 아니라는 점이다. 처음에는 나머지를 `type: string` 한 줄로 처리하고 싶었다. 그런데 `type: string`인 갈래가 하나라도 합집합에 있으면 `x.type === 'Identifier'`가 그 갈래를 걸러내지 못한다. 좁히기가 다시 통째로 죽는다. 그래서 따로 적지 않은 종류도 이름은 모두 나열했다. 공통 멤버를 담은 `NodeBase`를 합집합의 갈래로 넣지 않은 것도 같은 이유다.

이제 `if (x.type === 'Identifier')` 뒤에서 `x.name`은 `string`이다. 몇 겹 아래에서도 마찬가지다.

> [!NOTE]
> 치르는 값도 두 가지 있다. 좁히기 전에는 멤버를 쓸 수 없다. 종류를 확인하지 않고 `node.name`을 쓰면 그 자리에서 오류가 난다. 그리고 목록에 없는 이름과 `type ===`로 비교하면 "겹치지 않는다"는 오류가 난다. 둘 다 맞는 오류다. 앞의 것은 런타임에 `undefined.indexOf`로 터질 코드였고, 뒤의 것은 `Identifer` 같은 오타를 잡아 준다. 대신 만질 종류가 늘면 목록에 한 줄을 더해야 한다.

## 계약과 런타임이 어긋난 자리

`: any`를 걷어 내자 계약이 런타임과 다르게 적혀 있던 자리가 드러났다. `any`가 그 차이를 가리고 있었다.

**`j`의 호출 형태.** 계약에는 `j(source: string)` 하나만 적혀 있었다. 그런데 런타임의 `j`는 진짜 jscodeshift라서 경로(path)도 노드도 받는다. 룰은 `j(path).replaceWith(...)`를 실제로 쓰고 있었고, 계약이 그걸 몰라서 `j`를 `any`로 받아야만 컴파일됐다. 오버로드를 추가했다.

```ts title="ast.d.ts"
interface JApi {
  (source: string): Collection;
  <N extends AstNode>(path: NodePath<N>): Collection<N>;
  <N extends AstNode>(node: N): Collection<N>;

  identifier(name: string): Identifier;          // 전에는 전부 AstNode 를 돌려줬다
  callExpression(callee: AstNode, args: AstNode[]): CallExpression;
}
```

**빠진 종류.** `SequenceExpression`과 `expressions`가 계약에 없었다. `a[0, 1]` 같은 VB 배열 접근을 고치는 룰이 그 멤버를 실제로 읽는데, 계약에 이름이 없으니 `: any` 없이는 컴파일되지 않았다.

**마커 선택 함수의 반환 타입.** 표시할 자리를 고르는 `select`가 계약에는 경로 배열을 돌려준다고 적혀 있었다. 그런데 마커를 만드는 쪽은 `node.loc`을 본다. 경로에는 `loc`이 없어서, 계약대로 경로를 넘기면 마커가 `null`이 되고 아무 표시도 나오지 않는다. 오류도 나지 않는다. 같은 일을 하는 다른 헬퍼는 처음부터 노드를 넘기고 있었다. 계약을 노드 배열로 고쳤다.

**전역 객체.** 룰 헬퍼가 `window.Helpers`로 쓰는 자리가 통째로 `any`였다. 선언 파일의 `Window`에 색인 서명이 있어서, 이름을 따로 적지 않은 속성은 그 서명에 걸려 `any`가 됐다. 샌드박스에서는 `window`가 곧 전역이라 같은 객체인데, 타입만 따로 놀았다. 이름을 `Window`에 명시했다.

**판별 함수.** `isStringLiteral(a)`로 확인한 뒤에도 `a.value`를 쓸 수 없었다. 반환 타입이 `boolean`이었기 때문이다. 이 자리가 `as any`를 부르고 있었다. 타입 술어로 바꿨다.

```ts title="ast.d.ts"
type LiteralNode = Literal | (OtherNode & { value: LiteralValue });

interface AstHelpers {
  // 참이면 node.value 를 쓸 수 있다
  isStringLiteral(node: AstNode | null | undefined): node is LiteralNode;
  isNumericLiteral(node: AstNode | null | undefined): node is LiteralNode;
  // 리터럴이 아니어도 참일 수 있다('오류: ' + msg). 그래서 술어로 만들지 않는다
  isStringish(node: AstNode | null | undefined): boolean;
}
```

`LiteralNode`를 `Literal` 하나로 적지 않은 이유가 있다. 판별 함수는 파서마다 다른 이름(`StringLiteral`, `NumericLiteral`)도 함께 받는다. 계약이 `Literal`로만 좁혀 버리면 뒤에 오는 `x.type === 'StringLiteral'` 비교가 "겹치지 않는다"는 오류가 된다.

## 숫자로 확인했다

룰 원문에서 콜백 인자의 `: any`만 떼고 `tsc --noEmit`을 돌려 오류 수를 쟀다.

| | 처음 | 계약만 고친 뒤 | 룰 쪽까지 고친 뒤 |
|---|---:|---:|---:|
| 좁히기 관련 오류 | 37 | 21 | 0 |
| 암묵적 any | 175 | 119 | 0 |

룰 쪽은 타입만 손댔고 동작은 바꾸지 않았다. 남은 좁히기 오류는 `var decls = s.declarations`처럼 `type` 검사보다 멤버 접근을 먼저 하던 자리였다. 그 순서를 바로잡았다. 그 자리에는 "`type`만 봐서는 그 칸이 있는지 알 수 없다"는 주석이 붙어 있었는데, 이제 그 주석은 사실이 아니게 됐다.

마지막으로 `: any` 240개와 `as any` 4개를 전부 걷고, Monaco 편집기를 `strict: true`로 올렸다. 이제 편집기와 `typecheck`가 같은 것을 본다.

> [!TIP]
> 계약에 `any`가 쌓이기 시작하면 개수를 줄이기 전에 원인부터 본다. 이번에는 같은 코드를 두 곳에서 다른 설정으로 검사하고 있었고, 타입이 좁혀지지 않는 모양이었다. 두 원인을 고치지 않고 `any`만 지우면 다시 쌓인다.

## 정리

- 룰 편집기는 `strict: false`, 저장소 타입 검사는 `strict: true`였다. 둘을 동시에 조용하게 만드는 방법이 `: any`였고, 그 결과 자동완성이 꺼졌다.
- `type: string`에 멤버가 전부 optional인 노드 타입은 `===` 비교로 좁혀지지 않는다. 룰이 두세 겹을 파고들 때마다 `undefined`가 따라왔다.
- 노드를 `type` 리터럴로 갈리는 닫힌 합집합으로 다시 적었다. 나머지 종류도 이름을 다 나열해야 좁히기가 동작한다.
- `any`를 걷어 내자 계약과 런타임이 어긋난 자리가 드러났다. `j(path)`, 빠진 노드 종류, 경로 대신 노드를 줘야 하는 `select`, 색인 서명에 걸린 전역, 술어가 아닌 판별 함수를 고쳤다.
- 오류 수를 단계별로 재서 0이 된 것을 확인한 뒤에 편집기 설정을 `strict: true`로 맞췄다.
