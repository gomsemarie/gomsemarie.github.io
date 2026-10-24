---
title: "Monaco 자동완성용 d.ts를 TypeScript Compiler API로 만들기"
description: "노코드 UI 빌더의 스크립트 에디터에 위젯 자동완성을 붙인 과정을 정리했다. 위젯 타입에서 정적 d.ts를 생성하고, 화면 요소별 선언을 동적으로 주입하고, 패널끼리 자동완성이 섞이지 않게 격리하고, mapped type 속성이 any로 나오던 문제를 고쳤다."
date: 2026-10-17
category: "Tech/TypeScript"
tags: ["typescript", "monaco-editor", "compiler-api", "intellisense", "editor"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 9
---

노코드 UI 빌더에는 스크립트 탭이 있다. 화면에 놓은 위젯을 코드로 다루는 곳이다. 사용자는 여기서 `Button_save.setDisabled(true)` 같은 코드를 쓴다. 에디터는 Monaco를 쓴다.

자동완성이 없으면 이 탭은 쓰기 어렵다. 어떤 위젯에 어떤 메서드가 있는지 외워야 하고, 오타를 내도 실행하기 전까지 모른다. 이 글은 그 자동완성을 만든 과정이다.

## 손으로 쓴 d.ts의 한계

처음에는 위젯 타입 선언을 손으로 썼다. `declare global` 안에 `interface Button { getText(): string; setText(text: string): void; ... }`를 JSDoc과 함께 적어 두고 Monaco에 extra lib로 넣었다.

금방 어긋났다. 위젯 정의에 속성을 추가해도 d.ts는 그대로였다. 위젯이 늘수록 손으로 맞추는 일이 늘었다. 위젯 정의에는 이미 TypeScript 타입이 있으니, 거기서 선언을 뽑아내기로 했다.

## 위젯 타입에서 정적 d.ts를 뽑는다

### 왜 그냥 `.d.ts`를 넘기지 못하나

Monaco의 extra lib는 import를 따라가지 못한다. 위젯 타입은 React 타입, 공통 속성 타입, 여러 유틸리티 타입을 import해서 만든다. 그 파일을 그대로 넣으면 대부분 알 수 없는 타입이 된다. 필요한 것은 import 없이 혼자 서는 평평한 선언이다.

### 위젯 타입을 하나로 합치는 유틸리티

스크립트에서 위젯 하나로 할 수 있는 일은 세 가지다. 속성을 읽고, 메서드를 부르고, 공통 속성(id, 위치, 크기)을 다룬다. 이것을 하나의 타입으로 합쳤다.

```ts title="intellisense.types.ts"
import type { ComponentProps, ComponentType } from 'react';

interface BaseProps {
  id: string;
  position: { x: number; y: number };
  dimension: { width: number; height: number };
}

// 위젯 컴포넌트 타입에는 메서드 타입이 phantom 필드로 붙어 있다
export type ScriptApiOf<W extends ComponentType<any> & { __methods?: unknown }> =
  Omit<ComponentProps<W>, 'children'> &
  (W extends { __methods: infer M } ? M : {}) &
  BaseProps;
```

원래 빌더에는 속성과 메서드를 conditional type으로 꺼내는 유틸리티가 있었다. 그런데 위젯 컴포넌트 타입이 intersection이라 Compiler API에서 그 추론이 풀리지 않았다. 그래서 `ComponentProps`와 phantom 필드에서 직접 꺼내는 방식으로 바꿨다.

입력 파일은 위젯마다 한 줄씩 적는다. 생성 스크립트는 이름이 `Intellisense`로 끝나는 export만 읽는다.

```ts title="widget-intellisense.types.ts"
export type ButtonIntellisense = ScriptApiOf<typeof Button>;
export type InputIntellisense = ScriptApiOf<typeof Input>;
export type FormIntellisense = ScriptApiOf<typeof Form>;
// 위젯을 추가하면 여기에 한 줄 더하고 생성 스크립트를 돌린다
```

### Compiler API로 타입을 문자열로 푼다

스크립트는 `ts.createProgram`으로 이 파일을 읽고, 모듈의 export를 돌면서 `checker.getDeclaredTypeOfSymbol`로 타입을 얻는다. 그 타입을 재귀로 걸어 내려가며 문자열로 바꾼다.

```ts title="gen-intellisense.ts"
function typeToText(checker: ts.TypeChecker, type: ts.Type, depth = 0): string {
  if (depth > 8) return 'any'; // 재귀 타입 보호

  const flags = type.getFlags();
  if (flags & ts.TypeFlags.BooleanLike) return 'boolean';
  if (flags & ts.TypeFlags.String) return 'string';
  if (flags & ts.TypeFlags.Number) return 'number';
  if (type.isStringLiteral()) return `'${type.value}'`;

  if (type.isUnion()) {
    if (type.types.every((t) => t.getFlags() & ts.TypeFlags.BooleanLiteral)) return 'boolean';
    return type.types
      .map((t) => {
        const s = typeToText(checker, t, depth + 1);
        return isPlainFunction(t) ? `(${s})` : s; // a | (() => void)
      })
      .join(' | ');
  }

  // ... 배열, 함수, 객체 처리
  return checker.typeToString(type);
}
```

만들면서 정한 규칙이 몇 가지 있다.

- `boolean`은 내부적으로 `true | false` union이라 union보다 먼저 검사한다.
- union 안의 함수 타입은 괄호로 감싼다. `a | () => void`는 문법 오류다.
- `Promise`는 펼치지 않고 `Promise<X>`로 남긴다. 펼치면 `then`, `catch`와 내부 Symbol 이름까지 튀어나와 잘못된 문법이 된다. Monaco 기본 lib에 `Promise`가 있으니 이름만 남기면 된다.
- `CSSProperties`처럼 속성이 수백 개인 타입은 `Record<string, any>`로 줄인다. Monaco는 React 타입을 모르고, 펼치면 결과 파일이 너무 커진다. 이름을 모르는 큰 객체도 속성이 30개를 넘으면 같은 처리를 한다.
- 함수 속성은 `foo(x: number): void` 같은 메서드 꼴로, 나머지는 필드 꼴로 쓴다.

결과는 `declare global { interface Button { ... } }` 하나짜리 파일이다. 앱에서는 Vite의 `?raw` import로 이 파일을 문자열로 읽어 extra lib에 넣는다.

처음 버전은 IDE 패키지 안에서 위젯 다섯 개로 시작했다. 한 달쯤 뒤 위젯 패키지로 옮기면서 열한 개 위젯으로 늘렸다.

## 화면 요소마다 동적 d.ts를 만든다

정적 선언만으로는 `Button`이라는 타입을 알 뿐이다. 사용자가 실제로 쓰는 이름은 화면에 놓은 요소의 id다. 그래서 화면 스키마를 읽어 요소마다 선언 한 줄을 만들었다.

```ts title="build-element-dts.ts"
const VALID_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function buildElementDts(map: Record<string, string>): string {
  const lines: string[] = [];
  for (const [id, widgetType] of Object.entries(map)) {
    if (!VALID_IDENT.test(id) || !VALID_IDENT.test(widgetType)) continue;
    lines.push(`declare const ${id}: ${widgetType};`);
  }
  return lines.join('\n');
}
```

id가 식별자 규칙에 맞지 않으면 `declare const`를 만들 수 없다. 하이픈이나 점이 들어간 id는 자동완성에서 빠진다. 그래서 속성 패널과 아우트라이너에서 id를 바꿀 때 같은 정규식으로 미리 막았다.

언제 다시 만들지도 정해야 했다. 스키마가 바뀔 때마다 만들면 드래그나 타이핑 도중에도 d.ts가 계속 바뀌고, Monaco의 TypeScript worker가 매번 다시 처리한다. 저장하지 않은 요소가 자동완성에 바로 뜨는 것도 어색했다. 그래서 저장할 때와 파일을 처음 열 때만 만들었다. 저장 기록 id가 바뀌면 그때 스키마를 한 번 읽는다.

## 패널끼리 자동완성이 섞인다

빌더 화면 두 개를 탭으로 열자 문제가 보였다. A 화면 스크립트에서 B 화면의 요소 id가 자동완성으로 떴다. 원인은 두 가지였다.

### 1층: extra lib는 전역이다

Monaco의 extra lib는 모든 에디터가 함께 쓴다. 요소 선언 파일을 패널마다 다른 경로로 넣어도 전부 보인다. 그래서 extra lib 등록을 감싸는 레지스트리를 만들고, 각 lib에 scope를 달았다.

```ts title="extra-libs-registry.ts"
type StoredLib = { content: string; scope?: string };
const libs = new Map<string, StoredLib>();
let activeScope: string | null = null;

export function setActiveScope(scope: string | null) {
  if (activeScope === scope) return;
  activeScope = scope;
  applyAll();
}

function applyAll() {
  const visible = [...libs]
    .filter(([, lib]) => lib.scope === undefined || lib.scope === activeScope)
    .map(([filePath, lib]) => ({ filePath, content: lib.content }));
  monaco.languages.typescript.javascriptDefaults.setExtraLibs(visible);
}
```

scope가 없는 lib(위젯 interface)는 항상 보인다. scope가 있는 lib(요소 선언)는 그 scope가 활성일 때만 Monaco에 들어간다. 패널이 활성화되면 dockview의 활성 변경 이벤트에서 `setActiveScope(패널경로)`를 부르고, `setExtraLibs`로 한 번에 바꾼다. Monaco에는 extra lib 하나를 지우는 API가 없어서 일괄 교체가 오히려 단순했다.

### 2층: 사용자가 만든 함수도 섞인다

요소 id를 나눠도 사용자가 스크립트에 직접 쓴 함수와 변수가 다른 패널에서 보였다. TypeScript language service는 import, export가 없는 파일을 스크립트로 보고, 스크립트의 최상위 선언은 전역에 올라간다. 모든 모델이 한 프로젝트처럼 묶이니 서로 보인다.

해결은 `moduleDetection: 'force'`였다. 이 옵션을 켜면 import, export가 없어도 모든 파일을 모듈로 본다. 모듈의 최상위 선언은 그 파일 안에서만 보인다.

```ts title="use-force-module-detection.ts"
const FORCE = 3; // ModuleDetectionKind.Force, enum이 노출되지 않을 때 대비

function ensureForce(monaco: Monaco) {
  const defaults = monaco.languages.typescript.javascriptDefaults;
  const opts = defaults.getCompilerOptions();
  const force = monaco.languages.typescript.ModuleDetectionKind?.Force ?? FORCE;
  if (opts.moduleDetection !== force) {
    defaults.setCompilerOptions({ ...opts, moduleDetection: force });
  }
}

// 다른 곳에서 compilerOptions를 덮어쓰면 다시 켠다
defaults.onDidChange(() => ensureForce(monaco));
```

다른 모듈이 `setCompilerOptions`를 부르면 이 값이 풀릴 수 있어서 `onDidChange`를 구독해 다시 맞췄다. 이미 `force`면 아무것도 하지 않으니 무한 반복은 생기지 않는다.

> [!TIP]
> Monaco의 compilerOptions에 `lib`를 직접 적었다가 `Cannot find name 'console'` 같은 오류가 났다. lib 이름 매칭 문제로 일부 lib가 로드되지 않았다. `lib`를 빼면 Monaco 기본 lib 세트가 들어가 이 오류가 사라졌다.

## mapped type 속성이 전부 `any`로 나온다

생성된 파일을 열어 보니 이상했다.

```ts title="widget-intellisense.generated.d.ts"
declare global {
  interface Button {
    label: any;
    disabled: any;
    tabIndex: any;
    readOnly: any;
    style: any;
    className: any;
    id: string;
    // ...
  }
}
```

`id`는 제대로 나오는데 `label`, `disabled`는 `any`였다. 차이는 속성이 어디서 왔는가였다. `id`는 interface에 직접 선언된 속성이다. `label`과 `disabled`는 위젯 속성 정의에서 키를 골라 내는 mapped type으로 만들어진 속성이다.

기존 코드는 속성 타입을 이렇게 얻었다.

```ts title="gen-intellisense.ts"
checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration || prop.declarations?.[0]!);
```

mapped type이 만든 속성 symbol에는 `valueDeclaration`도 `declarations`도 없다. 그러면 위치 인자에 `undefined`가 들어가고, checker는 오류 타입인 `any`를 돌려준다. 오류를 던지지 않으니 생성은 성공한 것처럼 보였다.

위치가 필요 없는 `checker.getTypeOfSymbol(symbol)`로 바꿨다. 선언이 있으면 기존 방식을 쓰고, 없을 때만 이쪽으로 간다.

```ts title="gen-intellisense.ts"
function getSymbolType(checker: ts.TypeChecker, sym: ts.Symbol): ts.Type {
  const decl = sym.valueDeclaration ?? sym.declarations?.[0];
  if (decl) return checker.getTypeOfSymbolAtLocation(sym, decl);

  // mapped type이 만든 symbol처럼 선언이 없는 경우
  const getTypeOfSymbol = (checker as { getTypeOfSymbol?: (s: ts.Symbol) => ts.Type })
    .getTypeOfSymbol;
  if (getTypeOfSymbol) return getTypeOfSymbol.call(checker, sym);

  return checker.getDeclaredTypeOfSymbol(sym); // 최소한 중단은 막는다
}
```

함수 매개변수 타입을 얻던 곳도 같은 문제가 있어서 모두 이 헬퍼로 바꿨다. 그 뒤 `label`은 `string`, `disabled`는 `boolean`, `tabIndex`는 `number`, `style`은 `Record<string, unknown>`으로 나왔다. 이벤트 속성(`onClick` 등)은 그대로 `any`다. 이벤트 키를 고르는 타입이 일부러 `any`로 매핑하도록 정의돼 있어서다.

> [!NOTE]
> 생성기가 오류 없이 끝났다고 결과가 맞는 것은 아니다. 생성 결과 파일을 저장소에 커밋해 두면 이번처럼 `any`가 몰린 곳이나 고친 뒤 바뀐 타입을 diff로 확인할 수 있다.

이 기능은 AI 코딩 에이전트와 함께 작업했다.

## 정리

- Monaco extra lib는 import를 따라가지 못한다. 위젯 타입을 Compiler API로 풀어 import 없는 `declare global` 파일 하나로 만들었다.
- boolean union, union 안의 함수, `Promise`, 아주 큰 객체 타입은 따로 규칙을 정해 처리했다.
- 요소 id마다 `declare const id: 위젯타입;`을 만들어 넣었다. 저장할 때만 다시 만들고, id는 식별자 규칙으로 미리 막았다.
- 패널 격리는 두 층으로 했다. 요소 선언은 scope가 붙은 extra lib로, 사용자 정의 함수와 변수는 `moduleDetection: 'force'`로 나눴다.
- mapped type 속성은 선언이 없어서 `getTypeOfSymbolAtLocation`이 `any`를 돌려줬다. `getTypeOfSymbol`로 바꿔 실제 타입을 얻었다.
