---
title: "원본 JSON만 커밋하고 생성 TSX는 그때그때 만들기"
description: "화면 JSON과 거기서 생성한 TSX를 같이 커밋하니 충돌이 두 배로 나고 둘이 자주 어긋났다. TSX를 gitignore한 점 디렉터리로 빼고, prebuild 스크립트, IDE 기동 시 전체 동기화, 파일 감시가 TSX 첫 줄의 sha1 헤더를 보고 오래된 파일만 다시 만들게 했다."
date: 2026-05-28
category: "Tech/Editor"
tags: ["codegen", "vite", "build", "monorepo", "editor"]
series: "노코드 UI 빌더 개발기"
seriesOrder: 7
---

노코드 UI 빌더에서 저장한 화면은 두 형태로 존재한다. 하나는 화면 구조를 담은 JSON이다. 위젯 트리, 스크립트, 데이터셋 정의가 들어 있다. 다른 하나는 이 JSON을 React 컴포넌트로 바꾼 TSX다. 화면을 실제로 띄우는 뷰어는 TSX를 번들해서 쓴다. 변환은 팀이 같이 쓰는 사내 변환 스크립트가 맡는다.

처음에는 둘 다 커밋했다. 지금은 생성된 TSX를 저장소에서 빼고 필요한 시점에 다시 만든다.

## 둘 다 커밋할 때의 문제

JSON과 TSX를 같이 커밋하니 같은 문제가 반복됐다.

- **충돌이 두 배.** 같은 화면을 두 사람이 고치면 JSON도 충돌하고 TSX도 충돌한다. TSX 충돌은 사람이 손으로 풀 수 있는 종류가 아니어서, JSON을 맞춘 뒤 TSX를 다시 생성해야 한다.
- **원본과 결과의 불일치.** 누군가 TSX를 직접 고치거나, JSON만 바꾸고 변환을 잊으면 둘이 달라진다. 어느 쪽이 맞는지 알 수 없다.
- **읽을 수 없는 diff.** 생성된 TSX는 길다. 기계가 만든 코드라 PR에서 리뷰할 수 없다. 의미 있는 변경은 JSON 쪽에 있는데 diff는 대부분 TSX가 차지했다.
- **고아 파일.** 정리하다 보니 대응하는 JSON이 없는 TSX가 하나 나왔다. 언제 왜 남았는지 아는 사람이 없었다.

그래서 원본은 JSON으로 정하고, TSX는 언제든 다시 만들 수 있는 산출물로 취급하기로 했다. 산출물은 저장소에 넣지 않는다.

## 디렉터리를 나누고 gitignore

먼저 위치를 나눴다. JSON은 뷰어 패키지의 `src/makers/` 아래에 두고 커밋한다. TSX는 패키지 루트의 점(dot) 디렉터리에 생성하고 `.gitignore`에 넣었다. 이 글에서는 `.generated/screens/`라고 부른다. 기존에 `src/screens/`에 있던 생성 파일들은 새 위치로 옮기고 원래 폴더는 지웠다.

```text title="layout.txt"
viewer/
├── src/makers/*.screen.json      ← 커밋 (사람이 편집한 원본)
└── .generated/screens/*.tsx      ← gitignore (기계 생성)
```

위치를 옮기자 도구 쪽에서 문제가 세 가지 나왔다.

### 1) 번들러가 생성 파일을 찾아야 한다

뷰어는 화면 목록을 `import.meta.glob`으로 모은다. 경로만 새 위치로 바꾸면 생성된 TSX가 전부 번들에 들어간다. 화면을 추가할 때 등록 코드를 고칠 필요가 없다.

```ts title="screen-registry.ts"
// 생성된 화면 모듈을 모두 즉시 로드한다. 파일 이름이 화면 이름이 된다
const modules = import.meta.glob('../../../../.generated/screens/**/*.tsx', { eager: true });

export const screens: Record<string, React.ComponentType> = {};
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/').pop()!.replace(/\.tsx$/, '');
  screens[name] = (mod as { default: React.ComponentType }).default;
}
```

### 2) 개발 서버가 점 디렉터리를 무시한다

Vite가 쓰는 파일 감시기(chokidar)는 기본적으로 점으로 시작하는 디렉터리를 무시한다. 그래서 생성된 TSX가 바뀌어도 HMR이 일어나지 않았다. `server.watch.ignored`를 함수로 바꿔 생성 디렉터리만 예외로 뒀다.

```ts title="vite.config.ts"
export default defineConfig({
  server: {
    watch: {
      ignored: (file: string) => {
        if (file.includes('/.generated/') || file.endsWith('/.generated')) return false;
        return /(^|[\/\\])\../.test(file); // 그 밖의 점 디렉터리는 계속 무시
      },
    },
  },
});
```

### 3) 경로 별칭이 풀리지 않는다

생성된 TSX는 `@viewer/...` 같은 경로 별칭으로 import한다. tsconfig 경로를 Vite에 연결하는 플러그인은 tsconfig `include` 밖에 있는 파일의 별칭을 풀지 못했다. 처음에는 Vite `resolve.alias`에 별칭을 직접 등록해 막았다. 같은 날 tsconfig `include`에도 생성 디렉터리를 추가해서 타입 검사와 에디터도 이 파일들을 인식하게 했다.

## 언제 생성하나: 세 경로

TSX를 커밋하지 않으면 누가 언제 만드는지를 정해야 한다. 새로 클론한 직후, `git pull`로 JSON이 바뀐 직후, CI 빌드, 빌더에서 저장한 직후를 모두 덮으려고 경로를 셋 뒀다.

| 경로 | 언제 | 무엇을 |
|---|---|---|
| prebuild 스크립트 | 뷰어 `build` 실행 직전 | 모든 JSON을 검사하고 오래된 것만 생성 |
| IDE 기동 시 전체 동기화 | 사내 IDE(Electron) 메인 프로세스 준비 완료 시 | 같은 검사를 백그라운드로 실행 |
| 파일 감시 | IDE 실행 중 | 바뀐 JSON 하나만 다시 생성 |

**prebuild**는 IDE 없이도 동작해야 하는 경로다. CI나 새 클론에서 뷰어만 빌드해도 된다. npm의 `prebuild` 라이프사이클 훅에 스크립트를 연결해서, 빌드 명령을 바꾸지 않고도 자동으로 실행되게 했다. 수동 실행용 스크립트 이름도 따로 등록했다.

**IDE 기동 시 동기화**는 pull을 받고 IDE만 켜도 생성 디렉터리를 최신으로 맞춘다. 기동을 막지 않도록 결과를 기다리지 않고 던져 둔다. 대부분 이미 최신이라 건너뛰므로 비용은 거의 없다.

**파일 감시**는 IDE가 켜진 상태에서 다른 에디터로 JSON을 고치거나 브랜치를 바꾸는 경우를 맡는다. IDE가 직접 쓴 파일은 감시 이벤트에서 걸러서, 생성 → 감지 → 생성으로 도는 루프를 막았다. 같은 파일에 대한 동시 요청은 경로별 Promise 하나로 합쳤다.

세 경로 모두 같은 변환 스크립트 하나를 호출한다. 변환 로직이 한 곳에만 있으니 경로마다 결과가 달라질 일이 없다.

## 오래된 파일만 다시 만든다: sha1 헤더

매번 전체를 다시 만들면 느리다. 그래서 생성된 TSX 첫 줄에 원본 JSON의 sha1 해시를 적는다. 다음 검사에서 JSON 해시와 TSX 첫 줄의 해시가 같으면 건너뛴다.

```js title="sync-screens.cjs"
const { createHash } = require('crypto');
const fs = require('fs');

const sha1 = (text) => createHash('sha1').update(text, 'utf8').digest('hex');

function readHeaderHash(tsxPath) {
  if (!fs.existsSync(tsxPath)) return null;
  const firstLine = fs.readFileSync(tsxPath, 'utf8').split('\n')[0] ?? '';
  return /^\/\*\s*@source-hash:\s*([0-9a-f]{40})\s*\*\//.exec(firstLine.trim())?.[1] ?? null;
}

function ensureFresh(jsonPath, tsxPath, transpile) {
  const hash = sha1(fs.readFileSync(jsonPath, 'utf8'));
  if (readHeaderHash(tsxPath) === hash) return 'skipped';
  transpile(jsonPath, tsxPath); // 변환 스크립트를 자식 프로세스로 실행
  const body = fs.readFileSync(tsxPath, 'utf8');
  fs.writeFileSync(tsxPath, `/* @source-hash: ${hash} */\n/* @generated-at: ${new Date().toISOString()} */\n${body}`);
  return 'regenerated';
}
```

헤더 방식을 고른 것은 상태 파일이 따로 필요 없어서다. 생성 결과물이 자기가 어떤 원본에서 나왔는지를 스스로 들고 있다. 생성 디렉터리를 통째로 지워도 다음 실행에서 전부 다시 만들어진다. 해시는 내용으로 계산하니 파일 수정 시각이 바뀌는 체크아웃에도 흔들리지 않는다.

변환에 실패한 파일이 있어도 prebuild는 종료 코드 0으로 끝낸다. 일부 화면의 변환 버그 때문에 뷰어 빌드 전체가 깨지지 않게 하려고 그렇게 정했다. 대신 실패 목록을 stderr로 남겨 CI 로그에서 보이게 했다.

> [!WARNING]
> 해시는 JSON 내용만으로 계산한다. 변환 스크립트 자체가 바뀌어도 JSON이 같으면 최신으로 판단하고 건너뛴다. 작업 보고 문서에도 이 점을 확인 항목으로 남겼다. 변환 규칙의 버전을 해시에 섞는 것이 다음 개선 대상이다. 그 전까지는 변환기를 바꾼 뒤 생성 디렉터리를 지우고 다시 만든다.

## Prisma, Next.js와 비교

이 구조를 정리하면서 비슷한 문제를 푸는 도구들과 나란히 놓아 봤다.

**Prisma**는 `schema.prisma`를 커밋하고, 클라이언트 코드는 `prisma generate`로 만든다. 생성된 클라이언트는 기본 설정에서 저장소에 넣지 않는다. 애플리케이션 코드가 생성 코드를 import한다는 점에서 이 구조와 가장 비슷하다. 원본 스키마에서 생성 코드를 만들고 앱이 그것을 import하는 흐름이 같다.

**Next.js의 `.next`**는 빌드 산출물 디렉터리다. 역시 gitignore 대상이고, `next build`나 `next dev`가 알아서 채운다. 다만 사용자가 그 안의 파일을 직접 import하지는 않는다. 이 구조의 생성 TSX는 번들러가 `import.meta.glob`으로 직접 끌어오는 소스 코드라서, 빌드 결과물보다는 Prisma의 생성 클라이언트에 가깝다.

차이도 있다. 두 도구는 생성 시점이 CLI 명령 하나에 묶여 있다. 이 구조는 빌더 IDE라는 별도 프로세스가 있어서 생성 경로가 셋이 됐다. 그 대신 사람이 생성 명령을 기억할 필요가 없다. 빌드하면 prebuild가, IDE를 켜면 기동 동기화가, 편집하면 감시가 처리한다.

> [!NOTE]
> 생성 코드를 저장소 밖에 두기로 하면서 가장 먼저 확인한 것은 아무 준비 없이 새로 클론한 환경에서 빌드가 되느냐였다. prebuild 경로가 이 경우를 맡는다. 나머지 두 경로는 개발 중 편의용이다.

## 바꾼 뒤 달라진 점

- PR diff에는 JSON만 남는다. 위젯 추가, 속성 변경 같은 의미 단위로 읽힌다.
- 충돌은 JSON에서만 난다. 풀고 나면 TSX는 다시 만들어진다.
- 결과는 항상 원본에서 다시 만들기 때문에 원본과 결과가 어긋나지 않는다.
- 이 작업 직후 뷰어의 프로덕션 빌드가 IDE 없이 통과하는 것을 확인했다. 그 전에는 해결되지 않은 빌드 문제가 남아 있었다.

## 정리

- 원본 JSON만 커밋하고, 생성 TSX는 점 디렉터리에 두고 gitignore했다.
- 번들러는 `import.meta.glob`으로 생성 파일을 모으고, 감시기와 경로 별칭은 생성 디렉터리를 예외로 설정했다.
- 생성 시점은 prebuild, IDE 기동 시 전체 동기화, 파일 감시 세 경로로 덮었다. 셋 다 같은 변환 스크립트를 호출한다.
- TSX 첫 줄의 sha1 헤더로 오래된 파일만 다시 만든다. 상태 파일은 필요 없다.
- 해시에 변환 규칙 버전이 빠져 있어서 변환기 변경은 아직 감지하지 못한다.
- Prisma의 생성 클라이언트와 가장 비슷하고, `.next` 같은 빌드 산출물과는 import 방식이 다르다.
