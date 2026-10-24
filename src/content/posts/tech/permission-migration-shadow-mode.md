---
title: "URL 패턴 권한을 권한 카탈로그로 옮기고 shadow 모드로 전환하기"
description: "마지막에 맞은 URL 패턴이 이기는 레거시 권한을 '화면 → 탭 → 동작' 카탈로그로 바꿨다. 기존 권한과의 차이를 원인별로 분류해 검증하고, 실제 판정은 옛 규칙에 맡긴 채 새 규칙과 다른 판정만 기록하는 shadow 단계를 두었다."
date: 2026-10-08
category: "Tech/Architecture"
tags: ["authorization", "migration", "nextjs", "typescript", "architecture"]
series: "레거시 ERP 이관기"
seriesOrder: 4
---

회사 ERP를 새 스택(Next.js + PostgreSQL)으로 옮기고 있다. 기존 기능을 먼저 그대로 재현하고 개선은 나중에 한다는 원칙으로 진행했는데, 권한만은 그렇게 하기 어려웠다. 기존 규칙을 똑같이 옮기면 기존 보안 구멍까지 같이 옮겨진다.

그래서 권한 모델을 새로 만들고, 기존 권한을 새 모델로 옮긴 뒤 결과를 대조했다. 운영에서는 바로 바꾸지 않고 shadow 단계를 하나 두었다.

## 기존 방식: URL 패턴과 rank

기존 권한 데이터는 "역할 × 패턴" 연결이었다. 패턴 하나는 URL 조각 여러 개와 조회·등록·수정·삭제 플래그 네 개로 이뤄진다. URL 조각은 첫 글자가 연산자다. `=`는 일치, `^`는 시작, `$`는 끝, `*`는 포함이다.

판정은 이렇게 했다. 역할에 연결된 패턴을 rank 내림차순으로 끝까지 훑고, **마지막으로 맞은 패턴**의 플래그가 결과가 된다. HTTP 메서드는 플래그로 바꾼다(GET은 조회, POST는 등록, PUT·PATCH는 수정, DELETE는 삭제).

```ts title="legacy-rule.ts (원리만 다시 쓴 예시)"
type Pattern = { pattern: string; read: boolean; create: boolean; update: boolean; remove: boolean };

const flagOf = (p: Pattern, method: string) =>
  method === "GET" ? p.read
  : method === "POST" ? p.create
  : method === "PUT" || method === "PATCH" ? p.update
  : method === "DELETE" ? p.remove
  : false;

// patterns 는 rank 내림차순으로 정렬돼 있다고 가정한다
export function legacyAllowed(patterns: Pattern[], method: string, path: string) {
  let ok = false;
  for (const p of patterns) {
    for (const piece of p.pattern.split("|")) {
      const op = piece[0], s = piece.slice(1);
      const hit = s === "*" || (op === "=" && path === s) || (op === "^" && path.startsWith(s))
        || (op === "$" && path.endsWith(s)) || (op === "*" && path.includes(s));
      if (hit) ok = flagOf(p, method); // 덮어쓴다 — 마지막에 맞은 것이 이긴다
    }
  }
  return ok;
}
```

코드는 짧지만 운영 데이터와 같이 놓고 보니 문제가 여럿 나왔다.

- **화면 권한과 API 권한이 따로였다.** 화면용 패턴(`/orders/...`)과 API용 패턴(`/order-api/...`)을 사람이 각각 맞춰야 했다. 메뉴는 숨겼는데 API는 열린 조합이 수백 건이었다. 화면에서 숨기는 것만으로는 접근 통제가 되지 않는다(OWASP A01).
- **탭 권한은 서버에 없었다.** 탭 숨김은 패턴의 태그 문자열을 화면 코드가 하드코딩으로 비교하는 방식이었다. 서버 쪽에는 탭 개념이 없었다.
- **결과가 정해지지 않는 경우가 있었다.** rank가 같은 패턴이 여럿이면 `ORDER BY rank`만으로는 순서가 정해지지 않는다. DB 실행계획에 따라 결과가 바뀔 수 있었다.
- **권한 상승 경로가 있었다.** 넓은 접두 패턴(`^/user`) 때문에 일부 역할이 다른 계정의 역할을 바꾸거나 비밀번호를 초기화하는 API를 부를 수 있었다. 화면은 숨겨져 있었지만 API는 열려 있었다.
- **검사 자체가 빠진 API가 수십 개 있었다.** 기존 서버는 특정 어노테이션이 붙은 메서드만 검사했다. 어노테이션이 빠진 곳은 로그인만 하면 누구나 부를 수 있었다.

## 새 모델: 권한 카탈로그

새 모델은 코드에 둔 권한 카탈로그 하나를 기준으로 한다. 메뉴 그룹 → 화면 → 탭 구조를 선언하고, 권한 키는 `'<화면>[/<탭>].<동작>'`으로 만든다. 동작은 조회·등록·수정·삭제·엑셀 다섯 가지다. 화면과 서버가 같은 파일을 import한다.

```ts title="permissions.ts (가상의 화면으로 바꾼 예시)"
export const ACTIONS = ["read", "create", "update", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];

export const SCREENS = {
  "orders.list":   { title: "주문 목록", link: "/orders" },
  "orders.detail": { title: "주문 상세", link: "/orders/detail", tabs: { items: "품목", payment: "결제" } },
} as const;

type ScreenKey = keyof typeof SCREENS;
type TabOf<K extends ScreenKey> = (typeof SCREENS)[K] extends { tabs: infer T } ? `${K}/${Extract<keyof T, string>}` : never;
export type Resource = ScreenKey | { [K in ScreenKey]: TabOf<K> }[ScreenKey];

// 저장할 수 있는 키 전부 — 여기 없는 키는 저장을 거부한다
export const PERM_KEYS = new Set(
  (Object.keys(SCREENS) as ScreenKey[])
    .flatMap((s) => [s, ...Object.keys((SCREENS[s] as { tabs?: object }).tabs ?? {}).map((t) => `${s}/${t}`)])
    .flatMap((r) => ACTIONS.map((a) => `${r}.${a}`)),
);
```

규칙은 이렇게 정했다.

1. **기본 차단.** 모든 API 라우트가 자신이 어느 화면(또는 탭)의 권한인지 선언한다. 선언하지 않은 라우트는 빌드에서 걸린다. 타입으로 강제하고, 테스트가 라우트 파일을 전부 훑어 선언이 정확히 하나인지 확인한다.
2. **없는 키는 저장 거부.** 관리 화면에서 역할 권한을 저장할 때 `PERM_KEYS`에 없는 키가 있으면 저장하지 않는다. 오타 때문에 엉뚱한 권한이 생기지 않는다.
3. **순서 없는 합집합.** rank는 없다. 키가 있으면 허용한다. 탭은 "화면 조회 + 탭 동작" 두 키가 모두 있어야 한다.

```ts title="route.ts"
// 동작은 메서드에서 정한다(GET read, POST create ...)
export const GET = api(listItems, { perm: "orders.detail/items" });
export const PATCH = api(updateItem, { perm: "orders.detail/items" });
// 조회용 POST 처럼 메서드와 동작이 다르면 명시한다
export const POST = api(searchOrders, { perm: ["orders.list", "orders.detail"] }); // 하나라도 있으면

// 다른 파일(me/route.ts): 로그인만 하면 되는 라우트
export const GET = api(me, { perm: "self" });
```

```ts title="can.ts"
type Grants = { all: boolean; perms: ReadonlySet<string> };

export function can(g: Grants, resource: string, action: Action) {
  const [screen, tab] = resource.split("/");
  if (!(screen in SCREENS)) return false;
  if (g.all) return true;
  return tab
    ? g.perms.has(`${screen}.read`) && g.perms.has(`${resource}.${action}`)
    : g.perms.has(`${screen}.${action}`);
}
```

화면도 같은 `can()`으로 메뉴, 탭, 버튼을 그린다. 이제 URL 조각을 따로 맞출 일이 없다.

> [!NOTE]
> 역할 구조(한 사람에 역할 하나)는 바꾸지 않았다. 운영 데이터에 사용자별 예외 권한이 필요했던 흔적이 없어서 그대로 두었다.

## 기존 권한을 새 키로 옮기기: 동등성 검증

모델을 바꾸는 일보다 기존 데이터를 옮기는 일이 더 어려웠다. 이관 기준은 "지금 화면에 보이는 대로"로 잡았다. 역할마다 화면별로 기존 규칙의 계산 결과(보임, 편집 가능, 탭 태그)를 구해서 그대로 권한 키로 바꿨다. rank가 같은 패턴은 지금 운영에서 실제로 나오는 순서로 고정했다.

이관이 맞는지는 별도 스크립트로 확인했다. 운영 사본을 임시 DB에 복사해 이관한 뒤, 역할 × 라우트 × 메서드 조합마다 기존 판정과 새 판정을 나란히 계산했다. 차이는 건수만 세지 않고 원인별로 나눴다.

| 분류 | 뜻 | 기대 |
|---|---|---|
| same | 결과 같음 | 대부분 |
| close.ui-hidden | 화면은 숨겼는데 API가 열려 있던 것 → 새 규칙에서 막힘 | 의도한 차이 |
| close.tab-hidden | 탭은 숨겼는데 API가 열려 있던 것 → 막힘 | 의도한 차이 |
| close.ui-readonly | 화면은 조회만인데 API 쓰기가 열려 있던 것 | 0이어야 함 |
| open.ui-shown-api-denied | 화면은 보이는데 API가 막혀 고장 나 있던 것 → 열림 | 의도한 차이 |
| diff.other | 그 밖 | 0이어야 함 |

분류를 나눈 것은 차이 자체를 0으로 만들 생각이 없었기 때문이다. 막혀야 할 것은 막히고 열려야 할 것은 열려야 한다. 목표는 **설명되지 않는 차이 0건**으로 잡았다. 화면과 탭의 보임 여부는 차이 0건이었다. API 쪽 차이는 전부 위 표에서 "의도한 차이"로 적은 분류에 들어갔다. 권한 상승 API(계정, 역할, 비밀번호 초기화, 권한 표 쓰기)는 따로 세어, 새 규칙에서는 관리자 역할만 부를 수 있는지 확인했다.

> [!TIP]
> 분류마다 "막는다/연다"를 결정 항목으로 따로 남겼다. 나중에 shadow 기록을 볼 때 이미 결정한 차이인지 바로 알 수 있다.

권한 상승 경로는 새 시스템으로 전환할 때까지 두지 않았다. 기존 운영 DB에 금지 패턴 몇 개를 더하는 긴급 조치 SQL과 되돌리기 SQL을 먼저 만들었다. 이 SQL도 같은 스크립트로 적용 전후를 비교했다. 화면 보임 변화 0, 화면에서 정당하게 쓰는 API가 막히는 경우 0을 확인하고 나서 사람이 실행했다.

## legacy → shadow → new

검증을 마친 뒤에도 바로 새 규칙으로 막지는 않았다. 검증 스크립트는 라우트 템플릿에 예시 값을 넣어 계산하기 때문에 실제 사용자 요청과 다를 수 있다. 그래서 판정 모드를 환경변수 `PERM_MODE` 하나로 나눴다.

- **legacy**: 기존 URL 패턴 규칙으로만 판정한다.
- **shadow**: 기존 규칙으로 판정하고, 새 규칙도 같이 계산한다. 둘이 다르면 기록만 한다.
- **new**: 카탈로그 규칙으로 판정한다(로컬과 개발 환경의 기본값).

```ts title="authorize.ts"
export async function authorize(user: User, method: string, path: string, perm: RoutePerm) {
  const mode = permMode(); // 요청마다 환경변수를 읽는다
  let legacyOk = false;
  if (mode !== "new") {
    legacyOk = legacyAllowed(await legacyPatterns(user.role), method, path);
    if (mode === "legacy") { if (!legacyOk) throw forbidden(); return; }
  }
  const grants = await loadGrants(user.role);
  const nextOk = allowRoute(grants, perm, method);

  if (mode === "shadow") {
    if (nextOk !== legacyOk) await recordShadow(user.role, method, path, legacyOk, nextOk, perm);
    if (!legacyOk) throw forbidden(); // 실제 판정은 여전히 기존 규칙
    return;
  }
  if (!nextOk) throw forbidden();
  return grants;
}
```

shadow 기록은 이렇게 남긴다.

- 기록 테이블의 기본키는 (역할, 메서드, 경로)다. 같은 조합이 다시 나오면 행을 새로 만들지 않는다. 건수와 마지막 시각만 늘린다.
- 각 행에는 기존 판정, 새 판정, 라우트의 권한 선언, 처음 본 시각을 같이 둔다.
- 판정이 같은 요청은 기록하지 않는다.
- 기록에 실패해도 업무 요청은 막지 않는다. 콘솔에 경고만 남긴다.

```ts title="record-shadow.ts"
async function recordShadow(role: string, method: string, path: string, legacy: boolean, next: boolean, perm: RoutePerm) {
  console.warn("PERM_SHADOW", role, method, path, { legacy, next });
  await db.query(
    `insert into perm_shadow (role, method, path, legacy_ok, new_ok, perm)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (role, method, path) do update
       set legacy_ok = excluded.legacy_ok, new_ok = excluded.new_ok, perm = excluded.perm,
           cnt = perm_shadow.cnt + 1, last_at = now()`,
    [role, method, path, legacy, next, JSON.stringify(perm)],
  ).catch((e) => console.error("PERM_SHADOW 기록 실패", e.message));
}
```

이렇게 하면 표가 요청 수만큼 커지지 않는다. 운영에서 1~2주 동안 쌓인 행을 위 분류와 대조해 보고, 결정해 둔 분류 밖의 행이 없으면 `new`로 바꾼다. 되돌릴 때도 환경변수 하나만 바꾸면 된다.

> [!WARNING]
> shadow 기간에도 관리자는 기존 권한 화면에서 권한을 바꿀 수 있다. 그래서 `new`로 바꾸기 직전에 이관을 한 번 더 돌린다. 이때 새 관리 API로 누군가 이미 고친 행이 있으면 덮어쓰지 않고 멈추게 했다. 수정자 컬럼이 비어 있지 않은 행을 세는 방식이다. 새 표에서 사람이 고친 값을 이관 스크립트가 지우지 않게 했다.

## 전환하면서 발견한 문제

**연산자 없는 패턴은 아무 데도 맞지 않았다.** `/assets`처럼 첫 글자가 `/`인 패턴이 있었다. `/`가 연산자 자리로 읽혀서 어떤 경로와도 맞지 않았다. 화면은 보이는데 API가 막혀 그 화면은 고장 난 상태였다. 동등성 분류의 `open.ui-shown-api-denied`에서 드러났다.

**저장 쿼리가 컬럼 두 개를 바꿔 넣고 있었다.** 패턴을 등록하는 SQL이 태그와 설명을 뒤바꿔 저장했다. 어떤 패턴은 탭 태그 자리에 설명 문구가 들어가 있었다. 새 판정은 카탈로그 이름만 쓰므로 영향을 받지 않았다.

**"아직 열지 않은 화면 금지" 패턴이 이관 결과를 0으로 만들었다.** 기존에는 준비 중인 화면을 막는 금지 패턴이 있었다. "지금 보이는 대로" 옮기니 그 화면들은 관리자에게도 권한이 0개였다. 새로 연 화면에는 권한을 명시적으로 주는 마이그레이션을 따로 만들고, 이관을 다시 돌려도 그 값이 남게 했다.

**shadow 동안에는 새 화면을 마음대로 열 수 없다.** 기존 규칙이 실제 판정을 하기 때문에, 기존 규칙에 없는 새 화면의 API는 shadow 동안 관리자만 통과하게 했다. 새 기능을 다른 역할에게 열려면 `new` 전환을 기다려야 해서, 일정을 짤 때 이 제약을 미리 넣어야 했다.

**"처음 한 번만" 실행하는 권한 부여가 건너뛰어졌다.** 권한을 기본으로 주는 마이그레이션은 이미 실행했는지를 키로 기록한다. 그런데 서로 다른 브랜치에서 만든 마이그레이션 두 개가 같은 번호를 써서 실행 기록 키가 겹쳤고, 그중 하나가 건너뛰어졌다. 번호를 바꾸고 다시 적용했다.

## 정리

- 레거시 권한을 똑같이 옮기면 기존 구멍까지 따라온다. 그래서 차이를 원인별로 분류하고 분류마다 결정을 남겼다.
- 권한 키를 코드의 카탈로그로 만들었다. 라우트 선언 누락은 빌드에서, 없는 키는 저장할 때 막힌다.
- 검증 스크립트가 다루지 못하는 부분은 shadow 단계로 보완했다. 실제 요청에 두 규칙을 같이 돌리고, 판정이 다를 때만 (역할, 메서드, 경로) 단위로 한 줄씩 기록했다.
- 긴급한 보안 문제는 기존 시스템에 먼저 조치했고, 그 조치도 같은 비교 스크립트로 확인했다.

남은 일은 shadow 기록을 확인하고 `new`로 전환하는 것이다. 결과는 전환한 뒤에 따로 쓸 생각이다.
