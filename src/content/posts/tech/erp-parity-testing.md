---
title: "기존 API를 정답지로 쓰기: 응답과 DB 변화를 나란히 비교한 대조 테스트"
description: "동결한 기존 Java API를 덤프 복원본에 띄우고 새 API와 같은 요청을 보내 JSON 응답과 단계별 DB 변화를 비교했다. 조회는 전부 맞췄고, 쓰기에서 잡은 반올림·합산·정수 형·트랜잭션 범위 차이를 정리한다."
date: 2026-10-17
category: "Tech/Testing"
tags: ["parity-testing", "migration", "postgresql", "nodejs", "testing"]
series: "레거시 ERP 이관기"
seriesOrder: 2
draft: true
---

[1편](/posts/erp-ten-days-ai-migration/)에서 이관 원칙을 "기존 기능 100% 재현"으로 정했다고 썼다. 재현했다는 말은 확인할 수 있어야 의미가 있다. API가 수백 개라 사람이 하나씩 눌러 볼 수는 없었다. 그래서 기존 API를 정답지로 두고, 같은 요청을 두 API에 보내 결과를 기계로 비교했다.

대조 스크립트와 시나리오는 AI 코딩 에이전트와 함께 만들었다. 이 글은 그 구조와 비교 규칙, 그리고 대조로 잡은 이식 버그를 정리한 것이다.

## 두 벌의 API, 두 벌의 DB

기존 Java API는 전환 때까지 동결했다. 소스를 그대로 빌드해서 로컬에 띄웠다. 문제는 DB였다. 새 DB는 이관하면서 주민번호를 새 형식으로 재암호화했기 때문에 기존 API가 읽지 못한다. 그래서 기존 API는 이관 전 덤프를 복원한 로컬 PostgreSQL에 붙였다.

| | 서버 | DB |
|---|---|---|
| 기존 API | 동결한 Java, 로컬 실행 | 이관 전 덤프 복원본 |
| 새 API | Next.js, 로컬 실행 | 새 DB 사본(재암호화·첨부 구조 반영) |

대조 DB의 실명, 연락처, 계좌, 주민번호는 가명으로 바꿨다. 같은 원래 값은 양쪽에서 같은 가짜 값이 되게 결정적으로 바꿨다. 그래서 가명 처리 뒤에도 대조 결과는 그대로다. 시나리오 파일에도 실명을 쓰지 않았다.

로그인 계정도 분리했다. 대조용 계정은 개발용 계정과 다른 메일 도메인을 써서 섞이지 않게 했다.

## 조회 대조: JSON을 키 경로로 비교

조회 대조는 단순하다. 케이스 파일에 메서드, 경로, 쿼리를 적고, 두 API에 동시에 보내 응답 JSON을 재귀로 비교한다.

```ts title="compare-read.ts (원리만 다시 쓴 예시)"
type Case = { method?: string; path: string; query?: Record<string, string> };

const strip = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(strip)
  : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "respondedAt").map(([k, x]) => [k, strip(x)]))
    : v;

function diff(a: unknown, b: unknown, path = "$", out: string[] = []): string[] {
  if (out.length >= 15) return out; // 차이가 많으면 앞부분만
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}: 길이 ${a.length} ≠ ${b.length}`);
    a.slice(0, Math.min(a.length, b.length)).forEach((x, i) => diff(x, b[i], `${path}[${i}]`, out));
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) out.push(`${path}.${k}: 새 쪽에만 있음`);
      else if (!(k in b)) out.push(`${path}.${k}: 새 쪽에 없음`);
      else diff((a as any)[k], (b as any)[k], `${path}.${k}`, out);
    }
  } else if (a !== b) out.push(`${path}: ${JSON.stringify(a)?.slice(0, 24)} ≠ ${JSON.stringify(b)?.slice(0, 24)}`);
  return out;
}
```

값은 앞부분만 보여 준다. 차이가 나면 개인정보가 콘솔에 길게 찍히지 않게 하려는 것이다. 응답 시각 필드는 비교에서 뺀다.

첫날 기준으로 조회 케이스 355건이 기존과 전부 일치했다. 사용자 모듈의 차이 14건은 처음부터 의도한 차이로 분류했다. 새 API는 비밀번호 해시를 내보내지 않고, 주민번호를 마스킹해서 준다.

## 쓰기 대조: 단계마다 DB 변화를 본다

쓰기는 응답만 보면 안 된다. 둘 다 `true`를 돌려줘도 DB에 들어간 값이 다를 수 있다. 그래서 쓰기 대조는 양쪽 다 로컬 DB를 쓰고, 요청 전후의 DB를 통째로 떠서 비교했다.

1. 두 DB를 템플릿에서 다시 만든다. `CREATE DATABASE ... TEMPLATE`을 쓰면 몇 초면 된다. 새 쪽 템플릿은 시퀀스 값을 기존 쪽과 맞춰 둔다. 그래야 새로 생기는 행의 번호가 같다.
2. 시나리오의 단계를 하나씩 양쪽에 보낸다.
3. GET이 아닌 단계마다 두 DB의 스냅샷을 떠서, 직전 스냅샷과의 변화(행 추가·변경·삭제)를 구한다.
4. 기존 쪽 변화와 새 쪽 변화를 비교한다.

"등록 → 수정 → 삭제" 시나리오는 끝나면 DB가 원래대로 돌아간다. 마지막 상태만 보면 아무 차이도 안 보인다. 그래서 단계마다 비교했다.

```ts title="compare-write.ts (원리만 다시 쓴 예시)"
for (const [i, step] of scenario.steps.entries()) {
  legacyRes.push(await call(LEGACY, step, legacyRes));
  nextRes.push(await call(NEXT, step, nextRes)); // "{{0.data.id}}" 처럼 각자 앞 단계 응답에서 값을 꺼낸다
  problems.push(...diffJson(legacyRes[i], nextRes[i]).map((d) => `응답 ${i}: ${d}`));
  if ((step.method ?? "GET") === "GET") continue;

  const [afterL, afterN] = await Promise.all([snapshot("legacy"), snapshot("next")]);
  const dL = delta(beforeL, afterL), dN = delta(beforeN, afterN); // 테이블 → 기본키 → 바뀐 행
  problems.push(...diffDelta(dL, dN).map((d) => `DB(단계 ${i}) ${d}`));
  [beforeL, beforeN] = [afterL, afterN];
}
```

스냅샷은 모든 컬럼을 `::text`로 읽는다. 숫자 형이 달라도 문자열로 같으면 같다고 보고, 다르면 바로 드러난다. 부동소수는 `extra_float_digits = 3`으로 끝자리까지 읽었다.

시나리오가 많아지자 여러 작업이 동시에 대조를 돌리는 일이 생겼다. 두 DB를 공유하니 섞이면 결과가 엉망이 된다. 파일 잠금을 하나 두어 한 번에 하나만 돌게 했다.

## 차이를 고르는 규칙

모든 차이를 그대로 세면 의미 있는 차이가 묻힌다. 비교 전에 걸러 내는 규칙을 정했다.

- **실행 중에 생긴 시각 값은 같다고 본다.** 등록 시각 같은 값은 양쪽이 다를 수밖에 없다. 시나리오 시작 이후의 시각이면 같은 값으로 친다. 형식도 여러 가지라(`2026-10-07 16:07:31+09`, `2026.10.07 16:07:31` 등) 몇 가지 모양을 받는다.
- **주민번호는 양쪽 다 복호화해서 평문으로 비교한다.** 암호화 방식이 달라 암호문은 늘 다르다.
- **새 쪽에만 있는 테이블과 컬럼은 뺀다.** 첨부 구조, 이관 정보, 감사 로그 같은 것이다. 비밀번호 해시 컬럼도 뺀다.
- **오류 로그는 내용으로 비교한다.** 예외 이름, 메시지, 스택은 Java와 Node가 다를 수밖에 없다. 오류 코드, 메서드, 경로만 비교하고, 일련번호 대신 내용으로 행을 맞춘다. 앞 시나리오의 의도한 차이 때문에 번호가 밀려도 같은 로그는 같게 나온다.

> [!TIP]
> 규칙을 넣을 때마다 "이 규칙 때문에 진짜 차이가 가려지지 않는가"를 따졌다. 예를 들어 시각 규칙은 "시나리오 시작 이후"로 범위를 좁혀서, 기존 행의 날짜가 바뀌는 버그는 여전히 잡히게 했다.

## 대조로 잡은 이식 버그

첫날 쓰기 시나리오 80개 중 70개가 일치했다. 나머지 10개는 모두 의도한 차이였다. 주민번호 마스킹 값 덮어쓰기 방지 4개, 비밀번호 해시 미노출 5개, JSON 라이브러리 오류 문구 1개다. 70개에 이르기까지 대조가 잡아 준 이식 버그가 여럿 있었다.

**x.5 반올림이 달랐다.** 새 API는 요청 본문을 Java DTO 규칙대로 바인딩하고, 필드마다 Java 형을 기억해 SQL 파라미터 형을 정한다. `Double` 필드면 `float8`, `BigDecimal`이면 `numeric`이다. 처음에는 이 형 정보를 `WeakMap`에 객체를 키로 담았다. 그런데 서비스 코드가 `{ ...dto, 추가값 }`처럼 객체를 펼치면 새 객체가 생겨 형 정보가 사라졌다. 형을 모르니 소수는 `numeric`으로 보냈다. PostgreSQL의 `round()`는 `numeric`이면 .5를 0에서 먼 쪽으로 올리고, `double precision`이면 보통 짝수 쪽으로 맞춘다. 그래서 .5 경계에서만 값이 달랐다. 형 정보를 Symbol 키 속성으로 옮겼다. 펼쳐도 따라가고, JSON 응답이나 `Object.entries`에는 나오지 않는다.

**Java 합산은 Kahan 보정 합이었다.** 기존 코드는 공수 목록을 `stream().mapToDouble(...).sum()`으로 더했다. `DoubleStream.sum()`은 단순 덧셈이 아니라 보정 합산을 한다. `0.3 + 0.3 + 0.3 + 0.1 + 0.33`을 단순히 더하면 `1.3299999999999998`이 되지만 Java는 `1.33`을 낸다. `reduce`로 더하던 코드를 보정 합으로 바꿨다.

```ts title="java-sum.ts"
// DoubleStream.sum() 과 같은 결과를 내는 보정 합산
export function javaSum(values: number[]) {
  let hi = 0, lo = 0, simple = 0;
  for (const d of values) {
    const t = d - lo, v = hi + t;
    lo = (v - hi) - t;
    hi = v;
    simple += d;
  }
  const r = hi - lo;
  return Number.isNaN(r) && !Number.isFinite(simple) ? simple : r; // 무한대가 섞이면 단순 합을 쓴다
}
```

**정수 파라미터는 int4여야 했다.** 형 정보가 없는 정수 값을 처음에는 `int8`로 보냈다. 그러자 `integer`를 받는 DB 함수를 PostgreSQL이 찾지 못했다. 함수는 인자 형까지 맞아야 고른다. 기존 JDBC는 Java `int`를 `int4`로 보낸다. 범위 안의 정수는 `int4`로 보내게 바꿨다. `int4`는 `bigint` 자리에서는 자동으로 변환되니 반대 문제는 없다.

**트랜잭션 범위를 일부러 넓히지 않았다.** 매입 쓰기를 옮기면서 습관처럼 트랜잭션으로 감쌌다. 그런데 기존 메서드에는 `@Transactional`이 없었다. 문장마다 자동 커밋이라, 다시 등록하다 실패해도 앞에서 지운 행은 지워진 채로 남는다. 대조는 이 차이를 DB 변화로 보여 줬다. 기존과 같게 트랜잭션을 뺐다. 더 안전한 쪽으로 바꾸는 것도 동작 변경이기 때문이다.

이 밖에 잠금 조회 결과가 없을 때의 처리, 수당 등록 SQL의 파라미터 형 같은 것도 같은 방식으로 잡았다.

## 의도한 차이를 관리하기

첫날 이후 기존 버그를 고치기로 결정한 항목이 생기면서 "기존과 다른 것"이 늘었다. 고친 버그는 기존과 달라야 정상이다. 이런 차이를 불일치와 섞지 않으려고 두 가지를 했다.

- 시나리오 이름에 "의도한 차이(결정 번호)"를 붙였다.
- 결정을 반영할 때마다 대조 문서에 기준 수치를 다시 적었다. 예를 들어 "조회 일치 n · 차이 m(앞 기준 + 이번 결정 k)"처럼 쓰고, 어떤 결정으로 몇 건이 바뀌었는지 남겼다.

이렇게 하니 대조를 다시 돌렸을 때 기준 수치와 다르면 바로 이상하다는 것을 알 수 있었다. 한글 정렬 규칙을 바꿨을 때는 이름순 목록 몇 건이 "순서만" 다르다는 것까지 적어 두었다.

> [!WARNING]
> 정답지도 틀릴 수 있다. 기존 매출 등록 API는 DTO에 필드 하나가 빠져 등록·수정이 항상 500으로 끝나고 있었다. 대조만 믿으면 이 오류까지 재현하게 된다. 실제로 이식 초기에는 같은 500을 재현해 두었고, 고치는 것은 결정을 받은 뒤에 했다.

## 정리

- 동결한 기존 API를 덤프 복원본에 띄우고, 같은 요청을 두 API에 보내 비교했다.
- 조회는 JSON을 키 경로로 비교했다. 첫날 355건이 일치했고, 나머지는 의도한 차이로 분류했다.
- 쓰기는 응답과 함께 단계마다 DB 변화를 비교했다. 템플릿 DB로 몇 초 만에 같은 출발점을 만들었다.
- 시각, 암호문, 새 쪽 전용 컬럼, 오류 로그 문구처럼 다를 수밖에 없는 값은 규칙으로 걸렀다. 규칙이 진짜 차이를 가리지 않게 범위를 좁혔다.
- 대조가 x.5 반올림, Java 보정 합산, int4 형, 트랜잭션 범위 차이를 잡았다. 사람이 코드를 읽어서는 찾기 어려운 것들이었다.
- 의도한 차이는 이름과 기준 수치로 관리해서 불일치와 섞이지 않게 했다.
