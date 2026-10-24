---
title: "Electron IDE에 VSCode식 플러그인 붙이기: manifest, 발견, 단일 경계"
description: "빌드된 Electron IDE에서도 사용자가 플러그인을 추가하고 지울 수 있게 만든 과정을 정리했다. package.json의 contributes manifest와 zod 검증, 이벤트 채널 정책, 내장과 사용자 플러그인 발견, PluginContext 하나로 묶은 경계를 다룬다."
date: 2026-10-17
category: "Tech/Electron"
tags: ["electron", "plugin", "zod", "architecture", "typescript"]
series: "Electron IDE 개발기"
seriesOrder: 4
---

IDE에 기능을 넣을 때마다 IDE를 다시 빌드해야 했다. 할 일 목록 같은 작은 도구도 그랬다. 그래서 VSCode 확장처럼 플러그인을 붙이기로 했다. 목표는 하나였다. 패키징된 앱에서도 사용자가 플러그인을 추가하고 지울 수 있어야 한다.

2026년 6월에 AI 코딩 에이전트와 함께 작업했다. 시작하기 전에 설계 문서를 먼저 쓰고 핵심 결정을 표로 박아 두었다. 이 글은 그 결정과 구현을 정리한 것이다.

## 기존 인프라에서 빠진 것

플러그인이 하고 싶은 일은 명령 등록, 패널, 설정, 알림, 다른 플러그인과의 이벤트 주고받기다. 이 기능들은 IDE에 이미 있었다. 명령 팔레트, 2편의 패널 도킹, 설정 레지스트리, 토스트와 알림 센터, 이벤트 버스다. 명령 팔레트는 이미 owner 단위로 등록하고 해제할 수 있었다.

빠진 것은 그 사이를 잇는 부분이었다. manifest 형식, 플러그인을 찾는 방법, 켜고 끄는 lifecycle, 상태를 담을 registry, 실행 격리, 런타임에 추가되는 이벤트 채널 정책이다. 이벤트 버스는 타입을 declaration merging으로 정의하고 있었다. 그래서 런타임에 채널이 생기는 경우는 따로 길을 내야 했다.

## manifest는 package.json

manifest 파일을 따로 만들지 않고 `package.json`에 `contributes` 필드를 두었다. VSCode와 같은 방식이고, npm 도구를 그대로 쓸 수 있다.

```json title="package.json"
{
  "name": "memo",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "engines": { "ide": "^1.0.0" },
  "activationEvents": ["onCommand:memo.open"],
  "contributes": {
    "commands": [{ "id": "memo.open", "title": "메모 열기", "shortcut": "mod+shift+m" }],
    "panels": [{ "id": "plugin:memo.list", "label": "메모", "defaultSlot": "L1" }],
    "events": ["plugin:memo.saved"],
    "preferences": {
      "memo.fontSize": { "type": "number", "default": 13, "title": "글자 크기" }
    }
  }
}
```

`activationEvents`는 세 가지다. 시작할 때 바로 켜는 `onStartup`, 명령을 실행할 때 켜는 `onCommand:<id>`, 패널이 mount될 때 켜는 `onPanel:<id>`다. 첫 커밋에서는 `onStartup`만 동작했고, 나머지 둘은 며칠 뒤에 붙였다. manifest 정보로 가짜 명령과 패널을 먼저 등록해 두고, 실제로 호출되면 플러그인을 켜서 같은 id로 덮어쓴다.

## zod 검증: 실패해도 목록에서 빼지 않는다

manifest는 디스크에서 읽은 JSON이라 무엇이 들어 있을지 모른다. zod 스키마로 검증했다. 이름은 npm 규칙대로 소문자, 숫자, `-`, `_`만 허용한다. 패널의 기본 슬롯은 도킹의 슬롯 6개 중 하나여야 한다. `activationEvents`는 위의 세 형식만 통과한다.

검증에 실패하면 그 플러그인을 버리지 않았다. `error` 상태의 항목으로 registry에 넣는다.

```ts title="build-entry.ts"
function buildEntry(raw: unknown, dir: string, source: 'built-in' | 'user'): PluginEntry {
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const id = dir.split('/').pop() ?? dir;
    return { id, manifest: emptyManifest(id), source, dir, status: 'error', error: reason };
  }
  const range = parsed.data.engines?.ide;
  if (range) {
    const r = checkRange(IDE_API_VERSION, range);
    if (!r.ok) return { id: parsed.data.name, manifest: parsed.data, source, dir, status: 'error', error: r.reason };
  }
  return { id: parsed.data.name, manifest: parsed.data, source, dir, status: 'discovered' };
}
```

이유는 사용자 쪽에 있다. 폴더에 넣었는데 목록에 아무것도 안 뜨면 사용자는 무엇이 틀렸는지 알 수 없다. 목록에 빨갛게 뜨고 이유가 보여야 고칠 수 있다. 플러그인 하나가 깨져도 전체 발견 과정은 멈추지 않는다.

`engines.ide`는 semver 범위다. `>=`, `^`, `~`, 정확한 버전, 공백으로 이은 AND 조건만 직접 구현했다. 필요한 범위가 작아서 의존성을 늘리지 않았다.

## 이벤트 채널: 선언한 것만 보낸다

플러그인끼리 이벤트를 주고받게 하면 아무 이름으로나 보낼 수 있는지가 문제가 된다. 채널 정책은 "manifest의 `contributes.events`에 선언한 채널만 emit할 수 있다"로 정했다. 어떤 플러그인이 무엇을 내보내는지 manifest만 보고 알 수 있고, 이름 충돌도 미리 볼 수 있다.

이벤트 버스에 런타임 채널 API를 추가했다. 채널마다 owner 집합을 둔다. 플러그인을 켤 때 선언한 채널을 자기 owner로 등록하고, 끌 때 해제한다. 등록되지 않은 채널로 보내면 버스가 에러를 던진다. 구독은 등록 전에도 허용했다. 아직 켜지지 않은 플러그인의 이벤트를 미리 기다릴 수 있어야 하기 때문이다.

```ts title="dynamic-channels.ts"
const channels = new Map<string, Set<symbol>>();

function registerChannel(name: string, owner: symbol) {
  (channels.get(name) ?? channels.set(name, new Set()).get(name)!).add(owner);
}

function emitDynamic(name: string, payload?: unknown) {
  if (!channels.has(name)) throw new Error(`미등록 채널: ${name}`);
  for (const h of [...(listeners.get(name) ?? [])]) {
    try { h(payload); } catch (e) { console.error(e); }
  }
}
```

발견 단계에서는 채널 충돌도 검사한다. 두 플러그인이 같은 채널을 선언하면 경고를 남긴다. 이름은 `plugin:<플러그인 이름>.<이벤트>` 형식을 권장했다.

> [!WARNING]
> 지금 충돌 검사는 경고만 남기고 막지는 않는다. 버스도 한 채널에 owner 여러 개를 허용한다. 또 "선언한 채널만" 검사는 main thread에서 도는 플러그인의 context에서 한 번 더 하는데, Worker 경로는 버스의 "등록된 채널인가"만 본다. 다른 플러그인이 등록한 채널이면 통과한다. 정책을 엄격하게 하려면 이 두 곳을 막아야 한다.

## 내장 플러그인과 사용자 플러그인

플러그인은 두 곳에서 찾는다.

- **내장**: IDE와 함께 빌드된다. 지금은 할 일 관리 플러그인 하나다. manifest와 activate 함수를 코드 안의 표로 들고 있다.
- **사용자**: `<userData>/plugins/<id>/`에 있다. main process가 이 폴더를 읽는다.

main 쪽 서비스는 폴더 목록, manifest 읽기, 코드 읽기, 삭제, 플러그인별 저장소를 맡는다. `package.json`이 있는 폴더만 플러그인으로 본다. manifest는 파싱하지 않고 문자열로 넘긴다. 검증은 renderer의 zod가 한 번만 한다.

경로는 두 겹으로 막았다. id는 `[a-z0-9][-a-z0-9_]*`만 받는다. manifest의 `main`에 `..`이 있으면 거부하고, 경로를 resolve한 뒤에도 플러그인 폴더 안인지 다시 확인한다.

```ts title="plugin-fs.ts"
async function readCode(id: string, rel: string) {
  assertSafeId(id);
  if (rel.includes('..')) throw new Error(`잘못된 경로: ${rel}`);
  const dir = path.join(pluginsRoot, id);
  const file = path.resolve(dir, rel);
  if (!file.startsWith(dir + path.sep)) throw new Error(`폴더 밖 접근: ${rel}`);
  return fs.readFile(file, 'utf8');
}
```

플러그인별 저장소는 그 플러그인 폴더의 `.storage.json` 하나다. key 형식과 값 크기(1MB)를 제한했다.

## 빌드된 앱에서 추가하고 지우기

추가는 단순하게 했다. 플러그인 패널에서 plugins 폴더를 열고, 사용자가 폴더를 복사해 넣은 뒤 새로고침한다. 끌어다 놓는 설치는 넣지 않았다. 새로고침은 켜져 있는 사용자 플러그인을 모두 끄고 발견을 다시 돌린다.

삭제는 확인 창을 띄우고, 켜져 있으면 먼저 끈 뒤 폴더를 지우고 registry에서 뺀다. 내장 플러그인은 지울 수 없고 켜고 끄기만 된다.

사용자 플러그인 코드는 Worker 안에서 실행한다. main thread가 코드를 문자열로 읽어 Worker에 보내고, Worker가 그것을 평가해 activate를 부른다. 플러그인이 명령을 등록하거나 알림을 띄우려면 메시지를 보내야 하고, main thread가 그 메시지를 실제 store 호출로 바꾼다. 내장 플러그인은 신뢰할 수 있으니 main thread에서 바로 실행한다. React 컴포넌트는 메시지로 넘길 수 없어서, 패널을 가진 플러그인은 지금은 내장 방식으로만 만들 수 있다.

TypeScript로 쓴 플러그인은 IDE 안에서 esbuild-wasm으로 번들해 `dist/`에 쓰는 명령도 넣었다.

## PluginContext: 들어오는 문은 하나

가장 신경 쓴 것은 경계다. 플러그인 코드가 IDE의 store나 이벤트 버스를 직접 import하면, 끌 때 무엇을 남겼는지 알 수 없다. 그래서 플러그인은 activate에서 받는 `ctx` 하나로만 IDE에 닿게 했다.

```ts title="create-context.ts"
function createContext(entry: PluginEntry, owner: symbol): PluginContext {
  const declared = new Set(entry.manifest.contributes.events);
  return {
    commands: { register: (cmds) => commandStore.register(cmds, owner) },
    events: {
      emit: (ch, p) => {
        if (!declared.has(ch)) throw new Error(`미선언 채널: ${ch}`);
        bus.emitDynamic(ch, p);
      },
      on: (ch, h) => bus.onDynamic(ch, h),
    },
    panels: { register: (def) => trackPanel(owner, dockStore.register(def)) },
    preferences: { define: (def) => definePreference(def, owner) },
    storage: { get: (k) => ipc.storageGet(entry.id, k), set: (k, v) => ipc.storageSet(entry.id, k, v) },
  };
}
```

켤 때마다 새 `Symbol`을 owner로 만들고, ctx를 거치는 모든 등록에 그 owner를 붙인다. 끌 때는 플러그인이 돌려준 deactivate를 먼저 부르고, 실패해도 정리는 계속한다. 그다음 owner로 명령, 이벤트 채널, 패널, 설정 정의를 한꺼번에 지운다. 설정은 정의만 지우고 사용자가 바꾼 값은 남긴다. 다시 설치하면 그 값이 돌아온다.

activate가 실패하면 상태를 `error`로 바꾸고 같은 정리를 돌린다. 반쯤 등록된 명령이 남지 않는다.

> [!NOTE]
> 사용자 플러그인은 폴더 이름으로 찾고, manifest의 `name`을 id로 쓴다. 코드와 저장소 경로는 그 id로 다시 찾는다. 그래서 폴더 이름과 `name`이 다르면 코드를 읽지 못한다. 지금은 암묵적인 규칙이라 발견 단계에서 둘을 비교해 에러로 보여 주는 편이 낫다.

## 정리

- manifest는 `package.json`의 `contributes`(commands, panels, events, preferences)로 정하고, 디스크에서 읽은 값은 zod로 검증했다.
- 검증이나 버전 검사에 실패한 플러그인은 버리지 않고 `error` 상태로 목록에 남겨 이유를 보여 줬다.
- 이벤트는 manifest에 선언한 채널만 보내게 했다. 충돌 검사는 아직 경고 수준이고 Worker 경로의 검사도 느슨하다.
- 내장 플러그인은 코드 안의 표에서, 사용자 플러그인은 `<userData>/plugins/`에서 찾는다. 추가는 폴더 복사와 새로고침, 삭제는 끄고 폴더를 지우는 순서다.
- 플러그인이 IDE에 닿는 길은 `PluginContext` 하나로 묶고, 켤 때마다 만든 owner로 끌 때 흔적을 한 번에 지웠다.
