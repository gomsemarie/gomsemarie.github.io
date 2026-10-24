---
title: "zod 계약 패키지와 node --test, 그리고 코드를 망가뜨려 시험 확인하기"
description: "zod 스키마 하나로 서버 검증과 클라이언트 타입을 함께 만들고, 시험은 Node 내장 러너로만 돌렸다. 시험이 실제로 무언가를 지키는지는 코드를 일부러 망가뜨려서 확인했다."
date: 2026-08-17
category: "Tech/TypeScript"
tags: ["typescript", "zod", "node-test", "testing", "monorepo"]
series: "사내 변환 도구 개발기"
seriesOrder: 14
---

## 서버와 클라이언트가 같은 말을 해야 한다

팀이 함께 쓰는 사내 변환 도구는 pnpm 모노레포다. API 서버와 Electron 클라이언트가 있고, 그 사이에 도메인 로직과 변환 엔진, 룰 패키지가 있다. 그중 가장 작은 패키지가 가장 많이 불린다. 클라이언트와 서버 사이의 계약만 담은 패키지로, 여기서는 계약 패키지라고 부른다.

계약을 한 벌로 유지한 방법과, 시험이 실제로 무언가를 지키는지 확인한 방법을 차례로 적는다.

## 스키마 하나를 두 곳에서 쓴다

계약 패키지의 첫 주석은 "클라이언트와 API 서버의 유일한 계약."으로 시작한다. 안에 든 것은 zod 스키마와 거기서 뽑은 타입뿐이고, 도메인 로직에는 의존하지 않는다.

같은 스키마를 양쪽에서 다르게 쓴다.

- **서버에서는 런타임 검증.** 요청 본문, 룰 파일, 라이선스 파일, 외부에서 받은 표 데이터가 전부 바깥 입력이다. `safeParse`로 거른 뒤에야 안으로 들인다.
- **클라이언트에서는 타입.** `z.infer`로 타입만 가져간다. OpenAPI 문서를 뽑고 거기서 타입을 생성하는 단계가 없다.

```ts title="contract/index.ts"
import { z } from 'zod';

export const JobStateSchema = z.enum(['ok', 'missing', 'invalid', 'expired']);
export type JobState = z.infer<typeof JobStateSchema>;

export const StatusSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
  itemCount: z.number().int().nonnegative(),
  state: JobStateSchema.default('ok'),
});
export type Status = z.infer<typeof StatusSchema>;
```

```ts title="server/routes.ts"
import { StatusSchema, InstallRequestSchema } from '@app/contract';

app.get('/status', () => StatusSchema.parse(buildStatus()));

app.post('/install', (req, reply) => {
  const parsed = InstallRequestSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ code: 'BAD_REQUEST' });
  return install(parsed.data);
});
```

서버는 응답을 내보낼 때도 `parse`를 거친다. 들어오는 것뿐 아니라 나가는 것도 계약과 맞는지 서버가 직접 확인한다.

코드젠이 없으니 계약을 고치면 그 자리에서 양쪽 타입 검사가 함께 깨진다. 생성 스크립트를 다시 돌리는 걸 잊을 일이 없다. 저장소 전체로 보면 서버 쪽 파일 46곳, 클라이언트 쪽 134곳이 이 패키지를 들이고, 스키마 파일에 `z.infer`가 186번 나온다.

### 클라이언트도 가끔은 검증한다

클라이언트가 타입만 쓰지는 않는다. 연결 시험처럼 **상대가 누구인지 모르는** 자리에서는 클라이언트도 `safeParse`를 한다. 사용자가 서버 주소를 잘못 넣으면 전혀 다른 서버가 답할 수 있기 때문이다.

```ts title="client/ping.ts"
const parsed = StatusSchema.safeParse(await res.json());
if (!parsed.success) return { ok: false, error: '응답이 이 앱이 아는 형식이 아닙니다.' };
```

여기서 `.default()`가 쓸모 있었다. 서버와 클라이언트는 따로 배포되고, 폐쇄망에서는 서버만 먼저 올라가거나 클라이언트만 먼저 올라가는 일이 흔하다. 새 필드를 추가할 때 기본값을 붙여 두면 옛 서버가 그 필드를 보내지 않아도 새 클라이언트가 깨지지 않는다.

> [!WARNING]
> 기본값은 그 필드가 없던 시절의 서버를 기준으로 고른다. 이 저장소에는 "라이선스를 강제하는가"라는 필드가 있는데 기본값이 `false`다. 옛 서버에는 라이선스라는 개념이 없었다. 기본값을 `true`로 두면 멀쩡한 서버를 화면이 통째로 막는다. 안전해 보이는 값보다 그 시절의 사실을 기본값으로 둔다.

### 순서도 계약의 일부였다

스키마 파일이 3,700줄을 넘으면서 생긴 문제도 있다. 모듈은 위에서 아래로 실행된다. 위쪽 스키마가 파일 맨 아래에 정의된 enum을 쓰게 되자, 그 스키마가 만들어지는 순간 아직 없는 값을 읽어서 서버가 아예 뜨지 않았다. 지금은 그런 자리마다 왜 여기 있는지를 주석으로 적어 둔다.

## 러너는 Node 내장만 쓴다

시험 러너는 Vitest도 Jest도 아니고, 모든 패키지가 `node --test`를 쓴다. 이유는 앞 글에서 쓴 폐쇄망 반입과 같다. 저장소 자체가 폐쇄망에 들어가니 개발 의존성도 하나라도 덜 얹는다.

패키지마다 방식은 조금씩 다르다.

```json title="package.json (패키지별 test 스크립트)"
{
  "domain":  "tsc -b && node --test \"dist/**/*.test.js\"",
  "api":     "node --experimental-strip-types --test \"src/**/*.test.ts\"",
  "desktop": "cross-env TSX_TSCONFIG_PATH=tsconfig.app.json tsx --test \"src/**/*.test.ts\" ..."
}
```

- 도메인과 엔진은 먼저 컴파일하고 `dist`의 JS를 돌린다. 배포되는 결과물을 시험하는 방식이다.
- API 서버는 Node의 타입 벗기기로 `.ts`를 바로 돌린다.
- 데스크톱만 `tsx`를 쓴다.

데스크톱이 `tsx`로 옮겨 간 데는 사연이 있다. 처음에는 순수 함수만 시험하고 화면은 눈으로 확인했다. 그 틈으로 무한 렌더 루프가 빠져나갔다. 당시 시험 1,350개와 타입 검사가 모두 통과했고, 루프는 브라우저 콘솔에서만 보였다. 렌더 시험을 세우려 했는데, 타입 벗기기는 JSX를 다루지 못해서 `.tsx` 부품을 아예 들일 수 없었다.

`tsx`에는 `--tsconfig` 플래그가 없고 `TSX_TSCONFIG_PATH` 환경 변수만 본다. 이걸 안 주면 JSX를 옛 방식으로 바꿔서 `React is not defined`로 터진다. Windows에서 환경 변수를 넣으려고 `cross-env`를 썼다. 렌더 받침대는 `@testing-library/react` 없이 `react-dom/client`와 `act`로 직접 만들었다. 확인할 것이 그려지는지와 효과가 멈추는지 두 가지뿐이었다.

```ts title="render.test.tsx"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

test('목록이 그려지고 효과가 멎는다', async () => {
  const host = document.createElement('div');
  const errors: unknown[] = [];
  const orig = console.error;
  console.error = (...a) => errors.push(a);
  try {
    await act(async () => createRoot(host).render(<ItemList items={[]} />));
    assert.equal(errors.length, 0);
  } finally {
    console.error = orig;
  }
});
```

> [!NOTE]
> 무한 루프를 일부러 일으키는 시험도 한 번 두어 봤다. 러너가 176초를 쓰고 죽었다. React는 그 상황에서 `console.error`만 내고 멈추지 않는다. 그래서 시험을 둘로 나눴다. 실물 부품이 멈추는지 보는 시험과, 받침대가 그 경고를 듣는지 보는 시험이다.

## 시험을 시험한다

시험이 통과하는 것과 시험이 무언가를 지키는 것은 다르다. 앞 글의 WebSocket 버그가 그 예였다. 남은 시험이 자기 자신과 견주는 모양이라 상수가 무엇이든 통과했다.

그래서 시험을 세우거나 옮긴 뒤에는 코드를 일부러 망가뜨려 시험이 정말 깨지는지 본다. 돌연변이 시험(mutation testing)을 손으로 하는 방식이다. 도구는 쓰지 않았다. 지키려는 자리를 하나 골라 되돌리고, 시험을 돌리고, 몇 건이 죽는지 커밋 본문에 적는다.

커밋 본문에 "돌연변이"라는 말이 들어간 커밋이 열한 건이다. 대부분 룰 반입 병합 기능을 다시 짜던 이틀 사이에 몰려 있다. 그 기능은 받은 룰과 현장에서 고친 룰을 견주어 여덟 갈래로 판정한다. 틀려도 오류가 나지 않고 판정이 조용히 뒤집힌다. 시험이 제대로 지키는지 확인할 필요가 가장 큰 자리였다.

### 예 1. 자리만 만든 커밋

받은 룰의 전문을 기준선으로 따로 보관하는 커밋이 있었다. 아직 아무도 그 값을 쓰지 않고 자리만 만드는 커밋이다. 그래도 세 군데를 망가뜨려 봤다.

- 줄바꿈 정규화를 빼면 CRLF 시험이 깨진다
- "파일 없음"만 `null`로 치는 좁은 `catch`를 통짜 `catch`로 되돌리면, 폴더를 파일로 착각하는 경우의 시험이 깨진다
- 보관 폴더 위치를 스캔 대상 폴더로 옮기면 스캔 시험이 깨진다

통짜 `catch`가 왜 위험한지도 같은 본문에 적었다. 멀쩡한 기준선이 조용히 사라지면 현장에서 고친 룰이 전부 "양쪽이 고침"으로 묻힌다.

### 예 2. 보호가 줄지 않았나

다음 커밋은 판정의 기준을 지문 40글자에서 전문 비교로 바꿨다. 판정의 뜻은 하나도 바뀌면 안 된다. 그래서 바꾸기 전후로 같은 돌연변이를 넣고 죽는 시험 수를 견줬다.

```txt title="commit-body.txt"
기준선을 안 보게 만들면 바꾸기 전 5건, 바꾼 뒤 6건이 깨진다
(같은 5건 + 새로 세운 CRLF 시험).
kept→changed 2→3, both→changed 1→3, dropped 를 존재로 가르기 1→1.
줄어든 자리는 없다.
```

리팩터링의 안전망을 숫자로 남겼다. 늘어난 자리는 괜찮고, 줄어든 자리가 있으면 거기가 구멍이다.

### 예 3. 시험이 실물 폴더를 더럽혔다

API 시험 열다섯 개가 저장소의 실물 룰 폴더를 보고 있었다. 시험을 돌릴 때마다 그 폴더에 기준선 파일이 생겼다. 손으로 지우다가 지운 상태로 반입 판정을 돌렸더니 32개 파일이 전부 "양쪽이 다름"으로 떴다. 시험이 반입본의 임시 사본을 보도록 옮긴 뒤, 보호가 살아 있는지 돌연변이로 쟀다.

- 빈 룰 폴더를 주면 룰 내용에 기대는 시험 넷이 터진다. 표본이 빈 채로 통과하는 시험은 없다
- 익명 사용자를 관리자로 바꾸면 나머지 아홉의 권한 시험이 터진다

그리고 시험 전체 872개를 돌린 뒤 실물 폴더의 파일 목록과 크기, 수정 시각이 그대로인지 확인했다.

> [!TIP]
> 손으로 하는 돌연변이는 비싸지 않다. 지키려는 줄 하나를 되돌리고 시험을 한 번 돌리면 된다. 대신 무엇을 망가뜨렸고 무엇이 죽었는지를 커밋 본문에 적어야 한다. 그래야 다음에 시험을 고치는 사람이 그 시험이 무엇을 지키는지 안다.

## 누가 했나

계약 패키지는 동료와 함께 만들었다. 돌연변이로 시험을 확인한 열한 건은 모두 AI 코딩 에이전트와 같이 만든 커밋이다. 에이전트에게 일을 맡긴 방식은 다음 글에 따로 적었다.

## 정리

- 계약 패키지 하나에 zod 스키마만 둔다. 서버는 `safeParse`로 검증하고, 클라이언트는 `z.infer`로 타입을 가져간다. 코드젠 단계가 없다.
- 상대를 모르는 자리에서는 클라이언트도 검증한다. 따로 배포되는 환경에서는 `.default()`로 옛 서버와 호환을 유지한다.
- 러너는 `node --test` 하나다. 패키지에 따라 컴파일 후 실행, 타입 벗기기, `tsx`를 쓴다. JSX가 필요해진 데스크톱만 `tsx`로 옮겼다.
- 시험이 통과하는 것과 시험이 지키는 것은 다르다. 지키려는 줄을 되돌려 몇 건이 죽는지 보고, 그 숫자를 커밋 본문에 남겼다.
- 리팩터링 전후로 같은 돌연변이를 넣어 죽는 시험 수를 견주면 보호가 줄었는지 바로 보인다.
