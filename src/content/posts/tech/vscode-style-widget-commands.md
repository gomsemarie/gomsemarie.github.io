---
title: "위젯 하나에 세 곳을 고치던 구조를 정의 한 곳으로: VSCode식 위젯 커맨드"
description: "노코드 UI 빌더에서 위젯 전용 동작을 위젯 정의 안에 선언하면 우클릭 메뉴, 단축키, 커맨드 팔레트가 알아서 붙도록 바꾼 과정을 정리했다. 참고한 패턴 비교와 lodash merge가 React element를 망가뜨린 버그도 다룬다."
date: 2026-10-17
category: "Tech/Editor"
tags: ["react", "editor", "architecture", "typescript", "vscode"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 8
---

노코드 UI 빌더에는 자기만의 편집 화면이 필요한 위젯이 있다. 탭 위젯이 대표적이다. 탭 이름을 바꾸거나 순서를 바꾸려면 속성 패널의 입력칸 몇 개로는 부족해서, 별도 편집 창을 띄웠다.

문제는 그 편집 창을 붙이는 방법이었다. 위젯 하나에 전용 동작을 넣으려면 세 군데 이상을 고쳐야 했다. 이 글은 그 구조를 위젯 정의 한 곳에 선언하는 방식으로 바꾼 기록이다. AI 코딩 에이전트와 함께 작업했다.

## 위젯 하나에 손볼 곳이 세 군데

기존 흐름은 이랬다.

1. 위젯 패키지에서 탭 위젯을 정의한다. 여기에는 커맨드라는 개념이 없다.
2. IDE 패키지의 편집기 레지스트리에 `'Tab'` 문자열로 편집 창 컴포넌트를 등록한다.
3. 아우트라이너(요소 트리)의 우클릭 메뉴 코드가 위젯 타입으로 레지스트리를 찾아 메뉴 항목을 직접 추가한다.
4. 캔버스 우클릭 메뉴에는 위젯별 항목을 넣을 방법이 없다.
5. 단축키와 커맨드 팔레트는 지원하지 않는다.

여기서 생기는 문제는 네 가지였다.

- **결합도**: 아우트라이너와 캔버스가 위젯 타입을 알아야 했다.
- **분산**: 위젯 정의와 편집기 등록이 서로 다른 패키지에 있었다. 위젯을 읽어서는 그 위젯이 무슨 동작을 하는지 알 수 없었다.
- **불완전**: 단축키, 팔레트 같은 다른 진입점이 없었다.
- **확장 비용**: 위젯이 늘면 등록 작업도 늘고, 진입점을 하나 추가하면 모든 위젯을 손봐야 했다.

원하는 모습은 단순했다. 위젯을 만드는 사람은 위젯 파일만 고친다. 메뉴, 단축키, 팔레트는 그 선언을 읽어서 알아서 붙는다.

## 다섯 가지 패턴을 비교했다

비슷한 문제를 푼 도구들을 먼저 봤다.

| 패턴 | 대표 사례 | 강점 | 약점 |
|---|---|---|---|
| Contribution Points | VSCode `package.json`의 `contributes` | 선언적이고 정적 분석이 된다 | 명령형 로직을 담기 어렵다 |
| Block API | WordPress Gutenberg | 블록 정의 안에 UI까지 모인다 | 메타데이터와 UI가 섞인다 |
| Slot/Fill | MUI, Gutenberg `<Slot>` | 어디에 그릴지를 바깥에서 정한다 | 런타임에 의존한다 |
| Command 일급화 | VSCode commands + when 절 | 단축키, 검색, 매크로를 한 번에 엮는다 | 한 단계 간접 참조가 생긴다 |
| Capability/Provider | Eclipse, IntelliJ Platform | 확장성이 가장 넓다 | 배우는 비용이 크다 |

하나로 다 풀리지는 않았다. 요구사항을 쪼개 보니 패턴마다 맡을 부분이 달랐다.

- "위젯 정의 안에 모두 선언" → Contribution Points + Block API
- "여러 진입점에서 같은 동작" → Command 일급화
- "편집 창을 어떻게 띄울지는 호스트 마음" → Slot/Fill

그래서 섞었다. 커맨드를 중심에 두고, 어디에 노출할지는 contribution 목록으로, 어떻게 띄울지는 mounter로 나눴다. Capability/Provider는 지금 규모에는 과했다.

## 구조: 커맨드, 표면, 호스트, 마운터

### 커맨드는 객체다

모든 위젯 동작을 세 종류로 나눴다. 편집 UI를 띄우는 `editor`, 바로 실행하는 `action`, 켜고 끄는 `toggle`이다.

```ts title="widget-command.types.ts"
type SurfaceId =
  | 'canvas:context-menu'
  | 'outliner:context-menu'
  | 'command-palette'
  | 'keyboard-shortcut';

interface CommandContext {
  selectedIds: string[];
  focusedId: string | null;
}

interface CommandBase {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  contributes?: SurfaceId[];
  when?: (ctx: CommandContext) => boolean;
}

interface EditorCommand extends CommandBase {
  kind: 'editor';
  Component: React.ComponentType<{ nodeId: string; close: () => void }>;
  preferredMount?: 'overlay' | 'floating-window';
}

interface ActionCommand extends CommandBase {
  kind: 'action';
  run: (ctx: CommandContext) => void | Promise<void>;
}

interface ToggleCommand extends CommandBase {
  kind: 'toggle';
  get: (ctx: CommandContext) => boolean;
  set: (ctx: CommandContext, next: boolean) => void;
}

type WidgetCommand = EditorCommand | ActionCommand | ToggleCommand;
```

커맨드가 그냥 객체라서 테스트도 쉽다. `run(mockCtx)`를 부르면 된다. 화면에 띄우는 일과 동작 로직이 나뉜다.

### 표면은 기본값으로 정한다

커맨드가 나타나는 자리를 표면(surface)이라고 불렀다. VSCode의 contribution point에 해당한다. 위젯을 만드는 사람이 매번 표면을 적지 않도록 종류별 기본값을 뒀다.

```ts title="default-contributes.ts"
const DEFAULT_CONTRIBUTES: Record<WidgetCommand['kind'], SurfaceId[]> = {
  editor: ['canvas:context-menu', 'outliner:context-menu', 'command-palette'],
  action: ['command-palette', 'keyboard-shortcut'],
  toggle: ['command-palette'],
};
```

편집기 커맨드는 우클릭 메뉴와 팔레트에, 즉시 실행 커맨드는 팔레트와 단축키에 붙는다. 다르게 하고 싶을 때만 `contributes`를 적는다.

### 호스트가 모아서 실행한다

호스트 Provider는 등록된 모든 위젯의 커맨드를 평평하게 모으고, 종류에 따라 실행을 나눈다. 커맨드 팔레트와 단축키는 이미 있던 공통 모듈을 그대로 썼다. 새로 만든 것은 둘을 합치는 층뿐이다.

```tsx title="command-host.tsx"
type Mounter = (args: { command: EditorCommand; ctx: CommandContext }) => Promise<void> | void;
type MounterMap = { overlay: Mounter } & Partial<Record<'floating-window', Mounter>>;

function useCommandExecutor(commands: WidgetCommand[], mounters: MounterMap) {
  return useCallback(
    async (id: string, ctx: CommandContext) => {
      const cmd = commands.find((c) => c.id === id);
      if (!cmd || (cmd.when && !cmd.when(ctx))) return;

      switch (cmd.kind) {
        case 'action':
          return cmd.run(ctx);
        case 'toggle':
          return cmd.set(ctx, !cmd.get(ctx));
        case 'editor': {
          const mount = mounters[cmd.preferredMount ?? 'overlay'] ?? mounters.overlay;
          return mount({ command: cmd, ctx });
        }
      }
    },
    [commands, mounters],
  );
}
```

### 띄우는 방법은 호스트가 넣어 준다

편집 창을 오버레이로 띄울지, 떠다니는 창으로 띄울지는 위젯이 정하지 않는다. 위젯은 `preferredMount`로 희망만 적고, 실제 방법은 호스트가 mounter로 넣는다. IDE는 떠다니는 창을 쓰고, 다른 호스트는 오버레이만 줄 수도 있다. 그래서 `overlay`는 모든 호스트가 반드시 제공해야 하는 fallback으로 정했다.

캔버스 우클릭 메뉴 쪽 코드는 이렇게 줄었다. 캔버스는 위젯 타입을 전혀 모른다.

```tsx title="canvas-context-menu.tsx"
const widgetItems = toMenuItems(
  filterForSurface(host.commands, 'canvas:context-menu', ctx),
  ctx,
  host.execute,
);

contextMenu.show(event, [
  ...commonItems, // 복사, 잘라내기, 삭제
  ...(widgetItems.length > 0 ? ['---', ...widgetItems] : []),
]);
```

아우트라이너도 같은 helper 두 개를 쓴다. 나중에 툴바 같은 표면을 더해도 호스트 쪽에 한 줄을 더하면 된다.

## 위젯 쪽에서 보면

탭 위젯은 이제 이렇게 생겼다. IDE 패키지의 편집기 레지스트리 폴더는 통째로 지웠다.

```tsx title="tabs-widget.tsx"
export const Tabs = defineWidget({
  type: 'Tabs',
  label: '탭',
  commands: [
    {
      id: 'editTabs',
      kind: 'editor',
      title: '탭 편집',
      icon: PencilIcon, // element가 아니라 컴포넌트 참조
      Component: TabsEditorAdapter,
      preferredMount: 'floating-window',
      // contributes 생략 → 캔버스, 아우트라이너, 팔레트
    },
  ],
  propertyDefinitions: { /* ... */ },
});
```

선언 하나로 캔버스 우클릭, 아우트라이너 우클릭, 커맨드 팔레트 검색이 모두 생긴다. `defineWidget`은 한 위젯 안에서 커맨드 id가 겹치면 개발 모드에서 경고를 띄운다.

> [!NOTE]
> 나중에 캔버스 더블클릭도 표면으로 추가했다. 더블클릭에 걸린 커맨드가 있으면 첫 번째 것을 실행하고, 없으면 아무것도 하지 않아 입력 위젯의 기본 더블클릭 동작을 막지 않는다. 표면 하나를 더하는 데 위젯 코드는 탭 위젯의 `contributes` 한 줄만 바뀌었다.

## 아이콘이 깨지던 버그: lodash merge와 `$$typeof`

다 만들고 개발 서버를 띄우자 우클릭 메뉴를 여는 순간 이런 오류가 났다.

```text title="console"
Objects are not valid as a React child
(found: object with keys {type, key, props, _owner, _store}).
```

`type`과 `props`는 있는데 React가 element로 보지 않는다. React는 객체가 element인지 판단할 때 `$$typeof` 값이 React element용 Symbol인지 본다. 오류에 나온 키 목록에는 그게 없었다.

원인은 Provider에서 위젯 정의 묶음을 합치는 코드였다.

```ts title="builder-provider.tsx"
// 이전: deep merge
const widgetDefs = merge({}, BASE_WIDGETS, userWidgets);
```

lodash `merge`는 깊게 내려가며 새 객체로 복사한다. 그러다 커맨드의 `icon`에 들어 있던 `<PencilIcon />` element까지 일반 객체처럼 복사했고, 복사본에는 `$$typeof`가 남지 않았다. 기존 컨텍스트 메뉴의 `<CopyIcon />`이 멀쩡했던 이유도 여기서 설명됐다. 그 아이콘은 컴포넌트 안에서 바로 만들어서 merge를 거치지 않았다.

고친 방법은 위젯 타입 단위의 얕은 합치기다.

```ts title="builder-provider.tsx"
// 이후: 위젯 타입 단위 shallow merge
const widgetDefs = { ...BASE_WIDGETS, ...userWidgets };
```

두 묶음은 키가 겹치지 않았다. 기본 묶음에는 프레임 위젯 하나만 있고, 사용자 묶음에는 프레임이 없다. 그래서 결과는 같다. 위젯 정의는 모듈 수준에서 한 번 만들어지는 싱글턴이라 처음부터 깊게 합칠 이유가 없었다.

같은 계열의 문제가 하나 더 있었다. 빌더 코어 상태는 zustand와 immer로 관리하는데, 커맨드가 그 스토어를 거치면 element와 `forwardRef` 객체가 같은 오류를 냈다. 그래서 두 가지를 바꿨다.

- `defineWidget`이 커맨드를 정의에서 떼어 모듈 수준 `Map`에 따로 보관한다. 스토어에는 커맨드가 들어가지 않는다.
- `icon`은 element가 아니라 컴포넌트 참조로 받고, 메뉴를 그리는 시점에 element로 만든다.

> [!WARNING]
> React element는 평범한 객체처럼 보이지만 평범한 객체가 아니다. deep clone, deep merge, 불변 처리를 하는 스토어에 넣지 않는 편이 안전하다. 설정 객체에 아이콘을 담아야 한다면 컴포넌트 참조를 담고 그릴 때 만든다.

## 패널이 여러 개일 때

빌더 화면 두 개를 탭으로 나란히 열자 다른 문제가 보였다. 팔레트와 단축키에 등록하는 id가 `widget-command.위젯타입.커맨드id` 형태라 두 패널이 같은 id를 썼다. 팔레트에서 "탭 편집"을 고르면 엉뚱한 패널을 대상으로 잡았다.

먼저 패널마다 고유한 scope id를 받아 등록 id에 넣고, 단축키에는 scope를 걸어 포커스된 패널에서만 동작하게 했다. 이미 클립보드 기능에서 쓰던 방식이다. 다만 팔레트에는 scope 개념이 없어서, 비활성 패널의 항목이 중복으로 보이는 문제가 남았다.

며칠 뒤 VSCode처럼 활성 패널 기준으로 등록하도록 바꿨다. 호스트에 `isActive`를 넘기고, 비활성이면 팔레트와 단축키에 넘기는 배열을 빈 배열로 만든다. 등록 hook이 빈 배열을 받으면 알아서 해제하므로 별도 정리 코드는 필요 없었다.

```tsx title="command-host.tsx"
const paletteEntries = useMemo(
  () => (isActive ? toPaletteEntries(commands, scopeId) : []),
  [isActive, commands, scopeId],
);
useRegisterPaletteCommands(paletteEntries);
```

## 정리

- 위젯 전용 동작을 커맨드 객체로 만들고 위젯 정의 안에 선언하게 했다. 위젯 하나에 세 곳 넘게 고치던 일이 한 곳으로 줄었다.
- 하나의 패턴으로 풀지 않았다. 선언은 Contribution Points와 Block API, 실행은 Command 일급화, 띄우는 방법은 Slot/Fill에서 가져왔다.
- 표면은 커맨드 종류별 기본값을 두어 위젯 작성자가 대부분 생략하게 했다.
- 캔버스와 아우트라이너는 위젯 타입을 모른다. 표면을 추가할 때는 호스트 쪽에 한 줄을 더한다.
- lodash `merge`가 아이콘 element를 복사하면서 `$$typeof`가 빠졌다. 얕은 합치기로 바꾸고, 커맨드는 스토어 밖에 두고, 아이콘은 컴포넌트 참조로 받았다.
- 여러 패널이 열리면 등록 id가 겹친다. scope id로 나누고, 마지막에는 활성 패널만 등록하게 했다.
