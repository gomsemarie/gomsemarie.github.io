---
title: "AI와 함께 쓰는 저장소의 규칙"
description: "Electron IDE 저장소에서 AI 코딩 에이전트와 일하며 만든 규칙을 정리했다. CLAUDE.md의 Hard Rules, 주석 용어 검사 훅, 커밋 메시지 검증, 적대적 검토 문서를 다룬다."
date: 2026-10-17
category: "Tech/AI"
tags: ["claude-code", "ai", "git-hooks", "commitlint", "workflow"]
series: "Electron IDE 개발기"
seriesOrder: 7
draft: true
---

이 시리즈의 IDE는 상당 부분을 AI 코딩 에이전트와 함께 만들었다. 저장소 기록으로 보면 2026년 4월 22일에 처음으로 Claude 공동 작성 커밋이 들어갔다. 그 뒤 내 커밋 중 385개에 `Co-Authored-By: Claude` 줄이 붙어 있다. 같은 기간 내 커밋의 60% 남짓이다. 5월이 218개로 가장 많았다.

이 정도로 같이 쓰면 에이전트의 습관이 곧 저장소의 습관이 된다. 이미 있는 유틸을 또 만들고, 묻지 않고 큰 작업을 시작하고, 주석에 어색한 한자어를 쓴다. 한두 번이면 리뷰에서 고치면 되지만, 수백 커밋이 되면 규칙으로 막아야 했다. 이 글은 그 규칙들을 정리한 것이다.

## CLAUDE.md의 Hard Rules

Claude Code는 저장소 루트의 `CLAUDE.md`를 작업 지침으로 읽는다. 처음에는 프로젝트 소개와 명령어 목록 정도만 있었다. 5월 초에 맨 위에 "Hard Rules" 절을 만들고 8개 규칙을 적었다. 패키지별 지침보다 위에 있는 규칙이다.

그중 효과가 컸던 것은 세 개다.

### 패키지별 지침을 먼저 읽는다

저장소는 모노레포다. 공통 라이브러리, 위젯, Electron 공통, IDE 앱 같은 패키지마다 정책이 다르다. 예를 들어 위젯 패키지의 일부는 따로 배포되는 패키지라 디자인 외 변경은 사전 허락이 필요하다. 이런 내용은 각 패키지의 `CLAUDE.md`에 있다.

그런데 에이전트는 루트에서 작업을 시작하면 하위 지침을 놓치곤 했다. 그래서 "작업하는 패키지의 `CLAUDE.md`를 반드시 먼저 읽는다. 루트에서 작업해도 영향받는 패키지의 것을 읽는다"를 첫 규칙으로 두었다.

### 새로 만들기 전에 공통 모듈을 찾는다

가장 자주 겪은 문제는 중복이었다. 토스트, 모달, 우클릭 메뉴, 단축키 같은 것을 공통 모듈로 만들어 두었는데도 에이전트는 비슷한 훅을 새로 짰다. 있는지 모르기 때문이다.

그래서 두 가지를 했다. 하나는 IDE 패키지 지침에 "즉답 결정 매트릭스"라는 표를 넣은 것이다. 왼쪽 열은 "하고 싶은 일", 오른쪽 열은 "사용할 모듈"이다. "짧은 토스트"면 어떤 모듈의 어떤 함수, "사용자 확인 모달"이면 어떤 훅을 쓴다는 식이다. 다른 하나는 루트 규칙에 "직접 구현하기 전에 반드시 grep으로 기존 코드를 찾는다"를 적고, 패키지마다 돌릴 검색 명령을 그대로 넣은 것이다. 말로 "찾아봐"라고 하는 것보다 명령을 적어 두는 편이 잘 지켜졌다.

### Phase 작업은 계획부터 승인받는다

"Phase 3 — 패널 도킹 구현" 같은 큰 작업은 시작 전에 계획을 내고 승인받게 했다. 계획에 넣을 항목도 정했다.

1. 구현할 내용과 동작 시나리오
2. 참조한 디자인 시안의 위치
3. 만들거나 고칠 파일 목록과 파일별 용도
4. 쓸 공통 모듈
5. 쓸 라이브러리
6. 내가 답해야 할 질문

단순한 fix나 refactor는 예외로 두었다. 모든 작업에 계획을 요구하면 오히려 흐름이 끊긴다. 파일 목록을 먼저 받아 보면 "이건 이미 있는 모듈로 된다"를 구현 전에 말할 수 있었다. 고치는 비용이 가장 싼 시점이다.

나머지 규칙은 짧다. 커밋과 푸시는 명시적으로 요청할 때만 한다. `git reset --hard`, `--force` 푸시, 파일 삭제, `--no-verify`도 마찬가지다. 그 아래에는 LLM 코딩 행동 지침을 붙였다. 코딩 전에 가정을 말하고, 요청한 것만 최소로 만들고, 바꿔야 할 줄만 바꾸고, 검증 기준을 정해 확인하라는 내용이다.

> [!TIP]
> 규칙은 "하지 말 것"보다 "먼저 할 것"으로 쓰는 편이 잘 지켜졌다. "중복 구현 금지"보다 "구현 전에 이 명령으로 찾는다"가 효과가 컸다.

## 주석 용어는 훅으로 검사한다

주석과 커밋 메시지는 한국어로 쓰기로 했다. 문제는 에이전트가 쓰는 한국어였다. 기술 용어를 억지로 번역하거나, "무력화된다", "기인한다" 같은 한자어 술어를 자주 썼다. 한 달 뒤에 읽으면 사전을 찾아야 하는 문장이다.

동료가 AI 코딩 에이전트와 함께 이 문제를 규칙과 훅으로 만들었다. `CLAUDE.md`에는 원칙 다섯 개만 둔다. 기술 용어는 번역하지 않는다, 한자어 술어 대신 일상 동사를 쓴다 같은 것이다. 구체적인 단어 목록은 루트의 `terms.md` 표에 둔다. 표의 각 행에는 상태(`확정` 또는 `후보`)와 훅 판정 가능 여부가 있고, 사람이 검토해 `확정`으로 바꾼 행만 검사한다.

검사는 Claude Code의 `PostToolUse` 훅으로 돈다. Edit나 Write가 끝날 때마다 스크립트가 실행된다.

```json title=".claude/settings.json"
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit|Bash",
        "hooks": [{ "type": "command", "command": "node scripts/check-terms.cjs", "timeout": 15 }]
      }
    ]
  }
}
```

스크립트에서 중요한 점은 **새로 추가된 줄만** 본다는 것이다. 기존 주석까지 걸면 파일 하나 고칠 때마다 오래된 위반이 쏟아진다. 그러면 아무도 경고를 읽지 않는다.

```js title="check-terms.cjs"
const { execFileSync } = require('child_process');
const fs = require('fs');

function addedLines(root, file) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', file], { cwd: root, stdio: 'ignore' });
  } catch {
    return fs.readFileSync(file, 'utf8').split('\n'); // 추적 전 새 파일은 전부 새 줄
  }
  const diff = execFileSync('git', ['diff', 'HEAD', '-U0', '--', file], { cwd: root, encoding: 'utf8' });
  return diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
}

const isComment = (s) => /^\s*(\/\/|\*|\/\*)/.test(s);

function check(root, file, banned) {
  const hits = [];
  for (const line of addedLines(root, file).filter(isComment)) {
    for (const { bad, good } of banned) if (line.includes(bad)) hits.push(`${bad} -> ${good}: ${line.trim()}`);
  }
  if (hits.length) {
    process.stderr.write(hits.join('\n'));
    process.exit(2); // exit 2면 stderr가 에이전트에게 돌아간다
  }
}
```

exit code 2로 끝나면 stderr가 에이전트에게 전달된다. 에이전트는 경고를 보고 그 자리에서 고친다. 사람이 리뷰에서 지적할 일이 줄어든다.

그 밖의 세부 처리도 있다. 코드 파일은 주석 줄만 보고, `.md` 문서는 모든 줄을 본다. 규칙 문서 자체(`terms.md`, `CLAUDE.md`)는 표에 금지어가 들어 있어 제외한다. 한 줄에서 여러 단어가 걸리면 긴 쪽만 남긴다. 스크립트 안에서 오류가 나면 조용히 exit 0으로 끝낸다. 훅 때문에 편집이 막히면 안 되기 때문이다.

> [!NOTE]
> 한국어는 단어 경계가 없어서 짧은 한자어를 그대로 등록하면 엉뚱한 곳에 걸린다. 그래서 표에는 어미까지 붙여서 적는다. 이 표에는 지금 23개 행이 `확정`으로 올라가 있다.

## 커밋 메시지는 config를 직접 읽어 검증한다

커밋 메시지 형식은 `type(scope): 설명`이다. type 7개와 scope 8개를 commitlint 설정에 적어 두었다. 이 검증은 Claude를 쓰기 전인 2월에 고쳤다.

원래 husky `commit-msg` 훅은 shell 스크립트였다. `commitlint`를 실행하고, 영어 출력에서 `type-enum`이나 `scope-empty` 같은 규칙 이름을 grep해 한국어 안내로 바꿔 찍었다. 허용 type과 scope 목록도 shell 안에 따로 적혀 있었다. 설정 파일에 scope를 추가해도 안내 문구에는 반영되지 않았다.

그래서 Node 스크립트로 바꿨다. commitlint 설정 파일을 `require`해서 규칙 값을 직접 꺼내고, 헤더 첫 줄을 정규식으로 파싱해 검사한다.

```js title="validate-commit-msg.js"
const { readFileSync } = require('fs');
const { resolve } = require('path');

const { rules } = require(resolve(process.cwd(), 'commitlint.config.js'));
const types = rules['type-enum'][2];
const scopes = rules['scope-enum'][2];
const maxLength = rules['header-max-length'][2];

const header = readFileSync(process.argv[2], 'utf8').trim().split('\n')[0];
const m = header.match(/^(\w+)(?:\(([^)]*)\))?:\s*(.*)$/);
const errors = [];

if (!m) errors.push('type(scope): 설명 형식이 아니다.');
else {
  const [, type, scope, subject] = m;
  if (!types.includes(type)) errors.push(`허용되지 않은 type: ${type}`);
  if (!scope) errors.push('scope가 비어 있다.');
  else if (!scopes.includes(scope)) errors.push(`허용되지 않은 scope: ${scope}`);
  if (!subject.trim()) errors.push('설명이 비어 있다.');
  if (header.length > maxLength) errors.push(`${maxLength}자를 넘었다.`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`type: ${types.join(', ')}\nscope: ${scopes.join(', ')}`);
  process.exit(1);
}
```

목록이 설정 파일 한 곳에만 있으니 안내 문구가 어긋날 일이 없다. 덤으로 실패할 때 터미널에 "컨벤션 지켜"라고 쓴 작은 그림이 뜨게 했다.

이 규칙은 에이전트에게도 똑같이 걸린다. `CLAUDE.md`에도 허용 scope를 적어 두었지만 결국 훅이 막는다. 문서는 에이전트가 처음부터 맞게 쓰게 하고, 훅은 놓친 것을 잡는다.

> [!WARNING]
> 나중에 자동 merge 메시지를 통과시키려고 commitlint 설정에 `ignores`를 추가한 적이 있다. 그런데 훅은 commitlint를 부르지 않고 이 스크립트를 부른다. 스크립트는 `ignores`를 읽지 않는다. 그 뒤의 merge 커밋도 `chore(root): ... 머지` 형식으로 직접 썼다. 규칙을 한 곳에서 읽게 바꿨다면, 그 한 곳에 새로 추가하는 값도 실제로 읽히는지 확인해야 한다.

## 반박만 하는 검토 문서

규칙만으로는 막지 못하는 것도 있었다. 노코드 UI 빌더 부분을 다시 설계할 때, AI 에이전트 여러 개를 돌려 요구사항, 아키텍처, 영역별 평가, 통합 설계 문서를 만들었다. 문서는 그럴듯했다. 그럴듯해서 오히려 불안했다.

그래서 검토 문서를 하나 더 만들게 했다. 역할은 검증이 아니라 반박이다. 기본자세는 의심이다. 문서의 주장을 실제 코드 검색 결과, 업계 1차 자료와 셋으로 대조하게 했다. 불확실하면 blocker가 아니라 major로 적게 했다.

결과는 blocker 1건, major 8건이었다. blocker는 문서끼리의 모순이었다. 통합 문서는 어떤 설계를 기각했는데, 영역별 문서 세 개는 여전히 그 설계를 권장하고 있었다. 구현하는 사람은 보통 영역별 문서를 읽는다. 그러면 기각된 설계를 그대로 만들게 된다. 작은 것도 잡았다. 문서에 "호출하는 곳 7곳"이라고 적힌 함수를 실제로 찾아보니 8곳이었다.

검토 뒤에는 정정 문서를 따로 썼다. 검증되지 않은 "결정"은 "PoC 게이트"로 낮췄다. 기존 파일로 회귀를 확인하는 골든 테스트를 필수 조건으로 넣었다. 검토가 "현행 코드를 보고 평가했으니 현행이 옳게 나온 것 아니냐"고 지적한 부분은 따로 검증했다. 현행 설계를 읽지 않은 상태에서 요구사항만 보고 처음부터 다시 도출해 비교하는 방식이었다. 마지막에는 문서 세트 전체의 일관성을 점검했다.

AI가 쓴 문서를 AI에게 반박시키는 것이 이상해 보일 수 있다. 하지만 역할을 "의심"으로 고정하고 근거를 코드에서 직접 찾게 하면, 같은 모델이라도 다른 것을 찾아낸다.

## 정리

- AI 공동 작성 커밋이 수백 개가 되면 에이전트의 습관이 저장소의 습관이 된다. 리뷰보다 규칙으로 막는 편이 싸다.
- `CLAUDE.md` Hard Rules에서 효과가 컸던 것은 패키지 지침 먼저 읽기, 공통 모듈 먼저 찾기, 큰 작업은 계획 승인받기였다.
- 주석 용어 검사는 `PostToolUse` 훅으로 새로 추가된 줄만 본다. exit 2로 경고를 에이전트에게 돌려준다.
- 커밋 메시지 검증은 commitlint 설정을 직접 읽어 목록을 한 곳에 모았다. 설정에 새로 넣은 값이 실제로 읽히는지는 따로 확인해야 한다.
- AI가 만든 설계 문서는 반박 역할의 검토로 다시 봤다. 문서 간 모순과 결정으로 포장된 가정을 찾았다.
