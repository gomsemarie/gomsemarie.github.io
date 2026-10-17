---
title: "현업 요청을 Claude Code가 PR로 만들게 하기: 요청 창구에서 운영 반영까지"
description: "ERP 요청 창구에 올라온 요청을 GitHub Actions에서 Claude Code가 작업하고, 검사·미리보기·PR·병합·운영 반영까지 이어지게 만들었다. 에이전트에게 무엇을 주지 않을지 정한 보안 설계를 중심으로 정리했다."
date: 2026-10-17
category: "Tech/AI"
tags: ["claude-code", "github-actions", "oidc", "automation", "security"]
series: "레거시 ERP 이관기"
seriesOrder: 10
draft: true
---

회사 ERP에는 화면 안에서 바로 버그나 수정 요청을 남기는 요청 창구가 있다. 지금 보던 화면, 필터, 최근 API 오류 같은 맥락이 자동으로 붙는다. 요청이 쌓이자 다음 질문이 생겼다. 작은 요청은 사람이 코드를 열기 전에 AI 코딩 에이전트가 먼저 작업해 두면 어떨까.

그래서 요청 창구에서 버튼을 누르면 GitHub Actions에서 Claude Code가 돌고, 결과가 브랜치와 미리보기 주소로 돌아오게 했다. 이 저장소의 커밋은 대부분 AI 코딩 에이전트가 작성했다. 나는 그 에이전트를 운영하면서 이 흐름을 함께 만들었다. 설계 방향과 "이건 막아야 한다"는 판단은 내가 정했고, 구현은 에이전트와 같이 했다.

## 흐름 한눈에 보기

요청 하나가 운영에 반영되기까지의 단계는 이렇다.

1. 현업이 요청 창구에 요청을 남긴다.
2. 담당자가 AI로 작업 요청서를 만들고 고친 뒤 확정한다.
3. 담당자가 [작업]을 누르면 ERP가 `workflow_dispatch`로 워크플로를 실행한다.
4. 워크플로는 `feature/req-{환경}{번호}` 브랜치에서 `claude -p`로 작업시킨다.
5. 테스트·타입 검사를 다시 돌리고, 커밋·푸시하고, 미리보기 배포 주소를 ERP에 보고한다.
6. 요청자가 미리보기를 보고 추가 요청을 남기면 같은 브랜치에서 다음 회차로 이어 간다.
7. 최종 확인하면 develop으로 PR을 만들고, 담당자가 squash로 병합한다.
8. 시스템관리자가 [운영 반영]을 누르면 develop을 main에 합치고, 반영된 요청은 자동으로 완료된다.

워크플로 입력은 `op`(run, ask, sync, pr, merge, close, release), 환경, 요청 번호, 회차 네 개뿐이다. 작업 내용은 입력으로 받지 않는다. 워크플로가 시작하면 ERP에 직접 물어서 가져온다. 이 선택이 뒤에 나오는 보안 설계의 바탕이 됐다.

실제로 이 흐름을 거쳐 병합된 PR이 저장소에 남아 있다. 처음 두 건은 "[시험]"을 붙인 툴팁 추가였다. squash 커밋 본문에는 에이전트가 쓴 "바꾼 것 · 확인 방법 · 마이그레이션 필요 여부"가 그대로 들어간다.

## 에이전트에게 주는 것과 주지 않는 것

이 흐름에서 가장 오래 고민한 것은 "에이전트가 할 수 있는 일의 범위"였다. 요청 글은 현업이 쓴다. 캡처와 첨부도 들어간다. 그 내용이 에이전트에게 무슨 지시를 하든, 저장소와 배포를 망가뜨릴 수 없어야 했다.

### 허용 도구 화이트리스트와 회차 제한

Claude Code는 `--allowedTools`로 쓸 수 있는 도구를 명시했다. 파일 읽기·쓰기·검색, 그리고 정해진 명령만 Bash로 허용했다. 테스트, 타입 검사, lint, 코드 지도 생성, `git status`·`diff`·`log`·`show` 정도다. `git commit`과 `git push`는 목록에 없다. 커밋과 푸시는 워크플로가 한다.

```js title="run-agent.mjs (원리만 다시 쓴 예시)"
const allowed = [
  'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'Bash(npm test:*)', 'Bash(npx tsc:*)', 'Bash(npx eslint:*)',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)',
].join(',');

spawnSync('npx', [
  '-y', AGENT_CLI_VERSION,          // 버전을 고정한다
  '-p', instruction,
  '--output-format', 'json',
  '--permission-mode', 'acceptEdits',
  '--allowedTools', allowed,
  '--max-turns', '80',
  '--add-dir', REQUEST_DIR,         // 요청서·캡처는 저장소 밖 임시 폴더
], { env: agentEnv, timeout: 45 * 60_000 });
```

`--max-turns`와 프로세스 타임아웃을 둘 다 걸었다. 하나는 에이전트가 같은 시도를 반복하는 경우를, 하나는 명령 하나가 멈춰 있는 경우를 막는다. 작업 요청서와 첨부는 저장소 밖 임시 폴더에 둔다. 실수로 커밋될 일이 없다.

### 토큰을 환경 변수에서 지운다

GitHub Actions의 job에는 기본으로 `GITHUB_TOKEN`이 있다. OIDC 토큰을 받을 수 있는 `ACTIONS_ID_TOKEN_REQUEST_*` 값도 있다. 에이전트가 `env`를 출력하거나 요청 글에 속아 이 값을 쓰면 저장소에 직접 쓸 수 있다.

그래서 Claude Code를 띄울 때만 환경 변수를 걸러서 넘겼다. 에이전트에게는 모델 API 키만 남는다.

```js title="agent-env.mjs"
// 에이전트 프로세스에는 GitHub 토큰과 OIDC 요청 값을 넘기지 않는다
const agentEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^(GITHUB_TOKEN|ACTIONS_|INPUT_)/.test(k)),
);
```

환경 변수만 지워서는 부족했다. `actions/checkout`은 기본으로 토큰을 `.git/config`에 남긴다. 에이전트가 파일을 읽을 수 있으니 거기서 꺼낼 수 있다. checkout 단계마다 `persist-credentials: false`를 줬다. 푸시는 워크플로 스크립트가 토큰을 붙인 주소로 직접 한다.

> [!WARNING]
> 에이전트에게 "토큰을 쓰지 마라"고 지시하는 것은 보안 장치가 아니다. 지시는 요청 글로 덮일 수 있다. 쓸 수 없게 만드는 것만 장치로 쳤다.

### `.github/` 변경은 버린다

지시문에 ".github/는 고치지 말 것"을 넣었지만, 그것만 믿지 않았다. 에이전트가 끝나면 워크플로가 `.github` 폴더를 HEAD 상태로 되돌리고, 새로 생긴 파일도 지운다. 워크플로 파일을 바꿔 다음 실행의 권한을 넓히는 길을 닫은 것이다.

검사도 에이전트가 "통과했다"고 말한 것을 믿지 않고 워크플로가 다시 돌린다. 결과는 "테스트 통과 · 타입 실패" 같은 한 줄로 ERP 카드에 붙는다.

## ERP와 GitHub는 OIDC로 이야기한다

워크플로는 ERP에서 작업 내용을 받고, 진행 상태와 결과를 ERP에 보고한다. 이 통신에 공유 비밀을 두지 않았다. 워크플로가 GitHub OIDC 토큰을 받아 보내고, ERP는 GitHub 공개 키로 서명을 확인한다.

```ts title="verify-hook.ts (원리만 다시 쓴 예시)"
const JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));

export async function verifyWorkflowToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://token.actions.githubusercontent.com',
    audience: 'my-erp',
  });
  // 이 저장소 · 이 워크플로 파일 · develop/main 에서 돈 실행만
  if (payload.repository !== REPO) throw new Forbidden();
  if (!/^refs\/heads\/(develop|main)$/.test(String(payload.ref))) throw new Forbidden();
  if (!String(payload.workflow_ref).startsWith(`${REPO}/.github/workflows/agent-run.yml@`)) throw new Forbidden();
}
```

`workflow_ref`까지 확인하는 이유가 있다. 같은 저장소의 다른 워크플로나 feature 브랜치에서 고친 워크플로가 보낸 토큰은 거절해야 한다. 앞에서 `.github` 변경을 버리는 것과 짝을 이룬다.

반대 방향, ERP에서 GitHub로는 이 저장소의 Actions 실행과 내용 읽기만 되는 토큰을 쓴다. ERP 서버에 이 토큰이 없으면 요청 창구에 실행 버튼 자체가 나오지 않는다.

여기서 한 번 막혔다. 처음에는 OIDC 토큰을 시작할 때 한 번만 받아서 끝까지 썼다. 이 토큰은 몇 분이면 만료된다. 작업이 길어지면 마지막 완료 보고가 거절됐고, 카드는 계속 "작업 중"에 머물렀다. 지금은 보고할 때마다 새로 받는다. 보고는 세 번까지 다시 시도하고, 끝내 실패하면 실행을 실패로 남긴다. ERP 쪽에서도 카드를 열 때 오래 진행 중인 작업은 GitHub 실행 상태를 직접 확인해 바로잡는다. 이때 시각을 KST로 저장해 놓고 UTC로 읽는 바람에 "90분 넘으면 멈춤" 판단이 10시간 가까이 늦어지는 버그도 같이 고쳤다.

## 코드를 바꾸는 일은 비밀번호를 다시 묻는다

처음 설계는 GitHub Environment 승인자를 두는 것이었다. 사람이 GitHub에서 승인해야 job이 시작된다. 그런데 우리가 쓰는 요금제의 비공개 저장소에서는 이 기능을 쓸 수 없었다. 그래서 2차 확인을 ERP로 옮겼다.

- 작업, 추가 요청, 최신 develop 가져오기, 병합은 누를 때 ERP 비밀번호를 다시 입력한다. 틀리면 로그인 실패 횟수에 더해지고, 다섯 번이면 계정이 잠긴다.
- ERP는 버튼을 누른 순간 "대기 중" 기록을 남긴다. 워크플로는 시작하자마자 ERP에 같은 `op`와 회차의 대기 기록이 있는지 묻고, 없으면 아무것도 하지 않는다.

두 번째 장치 덕분에 ERP의 GitHub 토큰이 새더라도 워크플로를 직접 실행하면 헛돈다. 실행 버튼은 GitHub에 있어도, 무엇을 할지는 ERP가 쥐고 있다.

운영 반영도 같은 방식이다. 운영 ERP에서 시스템관리자만 [운영 반영]을 볼 수 있다. 누르면 develop에만 있는 커밋, 반영될 요청 수, 운영 DB에 아직 적용되지 않은 마이그레이션을 먼저 보여 준다. 빠진 마이그레이션이 있으면 버튼이 막힌다. 비밀번호를 확인하면 한 번만 쓰이는 대기 표시를 남기고, 워크플로는 그 표시가 있을 때만 develop을 main에 merge commit으로 합친다.

> [!NOTE]
> `GITHUB_TOKEN`으로 푸시한 커밋은 다른 워크플로를 깨우지 않는다. 그래서 main에 push되면 돌던 "반영 알림"이 운영 반영 때는 돌지 않았다. 운영 반영 job이 합친 커밋 범위에서 요청 번호를 직접 찾아 알리게 했다.

병합 단계에도 비슷한 확인을 넣었다. DB 마이그레이션이 든 PR은 개발 DB에 적용된 뒤에만 합친다. develop에 합치는 순간 개발계가 그 코드로 돌기 때문이다. 워크플로가 개발 ERP에 적용된 마이그레이션 목록을 OIDC로 물어보고, 빠진 것이 있으면 이유와 함께 멈춘다.

## 브랜치와 PR 정리

회차가 쌓이면 브랜치와 PR이 남는다. 정리 규칙은 이렇게 정했다.

- "처음부터 다시"는 이전 브랜치와 열린 PR을 닫고 develop에서 1회차로 새로 시작한다. 이어서 하지 않는다.
- 요청이 병합되지 않은 채 완료·반려·철회되면 열린 PR을 닫고 feature 브랜치를 지운다.
- 병합하면 브랜치를 지운다. PR 화면에 커밋과 변경 내용이 남고, 필요하면 브랜치를 되살릴 수 있다.

워크플로의 `concurrency` 그룹은 환경과 요청 번호로 묶었다. 같은 요청에 두 실행이 겹치지 않는다. 다른 요청끼리는 동시에 돈다.

## 빌드마다 만드는 코드 지도

에이전트가 요청을 받으면 먼저 "이 화면의 코드가 어디 있는지"부터 찾는다. 큰 저장소에서는 이 탐색에 회차가 꽤 쓰인다. 그래서 빌드할 때마다 화면에서 코드까지의 지도를 만들었다.

따라가는 길은 이렇다. 권한 카탈로그의 화면 키와 주소에서 페이지 파일을 찾는다. 페이지가 가져오는 화면 컴포넌트와 탭 컴포넌트를 찾는다. 그 파일 안의 `api("GET", "/경로")` 호출을 모아 API 라우트 파일과 매칭한다. 라우트 파일이 가져오는 서비스 파일까지 적는다.

```js title="build-code-map.mjs (원리만 다시 쓴 예시)"
// 화면 파일에서 API 호출 경로를 정규식으로 모은다
const CALL = /\bapi\b[^(\n]{0,80}\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*[`"](\/[^`"?]+)/g;

for (const [key, screen] of Object.entries(screens)) {
  const files = screenFilesOf(screen.link);         // 페이지 → 화면 → 탭 파일
  const apis = apiRoutesOf(files);                  // 호출 경로 → route.ts
  map[key] = { page: screen.page, files, apis, services: apis.flatMap(servicesOf) };
}
writeFileSync('code-map.gen.json', JSON.stringify(map, null, 1));
```

정규식으로 읽기 때문에 놓치는 파일이 있다. 그래도 괜찮다고 판단했다. 지도는 정답이 아니라 출발점이다. 작업 요청서의 "관련 코드" 절에 요청을 남긴 화면과 글에 나온 화면의 지도를 넣고, "이 파일부터 보되 다른 파일도 살펴볼 수 있다"고 적는다. `package.json`의 build 스크립트 앞에 붙여서 지도가 코드와 어긋나지 않게 했다.

## 정리

- 요청 창구 → `workflow_dispatch` → feature 브랜치에서 `claude -p` → 검사·커밋·미리보기 보고 → PR → squash 병합 → 운영 반영까지 한 흐름으로 이었다.
- 에이전트에게는 모델 API 키만 준다. GitHub 토큰과 OIDC 요청 값은 환경 변수에서 지우고, checkout에 `persist-credentials: false`를 줬다.
- 도구는 화이트리스트로 열고, `--max-turns`와 타임아웃을 함께 걸었다. 커밋·푸시와 검사는 워크플로가 한다. `.github/` 변경은 버린다.
- ERP와 워크플로는 공유 비밀 없이 OIDC로 확인한다. 저장소, 브랜치, 워크플로 파일까지 본다.
- 코드를 바꾸는 일과 운영 반영은 ERP에서 비밀번호를 다시 묻고, 워크플로는 ERP의 대기 기록이 있을 때만 움직인다.
- 빌드마다 화면 → API → 서비스 코드 지도를 만들어 작업 요청서의 출발점으로 넣는다.
