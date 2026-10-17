---
title: "URL 패턴 권한을 권한 카탈로그로 옮기고 shadow 모드로 전환하기"
description: "마지막에 맞은 URL 패턴이 이기는 레거시 권한을 '화면 → 탭 → 동작' 카탈로그로 바꿨다. 기존 권한과 같은지 먼저 검증하고, 옛 규칙으로 막으면서 새 규칙과 다른 판정만 기록하는 shadow 단계를 거쳐 전환한 과정을 정리했다."
date: 2026-10-17
category: "Tech/Architecture"
tags: ["authorization", "migration", "nextjs", "typescript", "architecture"]
series: "레거시 ERP 이관기"
seriesOrder: 4
---

회사 ERP를 새 스택(Next.js + PostgreSQL)으로 옮기는 중이다. 원칙은 "기존 기능을 그대로 재현하고, 개선은 그다음"이었다. 그런데 권한은 그대로 옮기기 어려웠다. 기존 규칙을 똑같이 재현하면 기존 보안 구멍도 같이 옮겨지기 때문이다.

이 글은 권한 모델을 바꾼 이유, 기존 권한을 새 모델로 옮기면서 결과가 같은지 확인한 방법, 운영에서 바로 바꾸지 않고 shadow 단계를 둔 방법을 정리한 것이다. 분석 스크립트와 이관 코드는 AI 코딩 에이전트와 같이 작성했다. 판단이 필요한 결정은 사람이 내렸다.

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

코드는 짧은데 운영 데이터와 합쳐 보면 문제가 많았다.

- **화면 권한과 API 권한이 따로였다.** 화면용 패턴(`/orders/...`)과 API용 패턴(`/order-api/...`)을 사람이 각각 맞춰야 했다. 메뉴는 숨겼는데 API는 열린 조합이 수백 건 나왔다. 화면에서 숨기는 것은 접근 통제가 아니다(OWASP A01).
- **탭 권한은 서버에 없었다.** 탭 숨김은 패턴의 태그 문자열을 화면 코드가 하드코딩으로 비교하는 방식이었다. 서버는 탭을 몰랐다.
- **결과가 정해지지 않는 경우가 있었다.** rank가 같은 패턴이 여럿이면 `ORDER BY rank`만으로는 순서가 정해지지 않는다. DB 실행계획에 따라 결과가 바뀔 수 있었다.
- **권한 상승 경로가 있었다.** 넓은 접두 패턴(`^/user`) 때문에 일부 역할이 다른 계정의 역할을 바꾸거나 비밀번호를 초기화하는 API를 부를 수 있었다. 화면은 숨겨져 있었지만 API는 열려 있었다.
- **검사 자체가 빠진 API가 수십 개 있었다.** 기존 서버는 특정 어노테이션이 붙은 메서드만 검사했다. 어노테이션이 빠진 곳은 로그인만 하면 누구나 부를 수 있었다.

## 새 모델: 권한 카탈로그

새 모델의 중심은 코드에 있는 권한 카탈로그 하나다. 메뉴 그룹 → 화면 → 탭 구조를 선언하고, 권한 키는 `'<화면>[/<탭>].<동작>'`으로 만든다. 동작은 조회·등록·수정·삭제·엑셀 다섯 가지다. 화면과 서버가 같은 파일을 import한다.

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

원칙은 세 가지다.

1. **기본 차단.** 모든 API 라우트가 자신이 어느 화면(또는 탭)의 권한인지 선언한다. 선언하지 않은 라우트는 빌드에서 걸린다. 타입으로 강제하고, 테스트가 라우트 파일을 전부 훑어 선언이 정확히 하나인지 확인한다.
2. **없는 키는 저장 거부.** 관리 화면에서 역할 권한을 저장할 때 `PERM_KEYS`에 없는 키가 있으면 저장하지 않는다. 오타로 권한이 생기는 일이 없다.
3. **순서 없는 합집합.** rank가 없다. 키를 가지고 있으면 허용이다. 탭은 "화면 조회 + 탭 동작" 두 키가 모두 있어야 한다.

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

화면도 같은 `can()`으로 메뉴, 탭, 버튼을 그린다. URL 조각을 맞추는 일이 사라졌다.

> [!NOTE]
> 역할 구조(한 사람에 역할 하나)는 바꾸지 않았다. 운영 데이터를 보니 사용자별 예외 권한이 필요하다는 흔적이 없었다. 바꿀 이유가 없는 것은 그대로 두었다.

## 기존 권한을 새 키로 옮기기: 동등성 검증

모델을 바꾸는 것보다 기존 데이터를 옮기는 쪽이 어려웠다. 이관 규칙은 "지금 화면에 보이는 대로"였다. 역할마다 화면별로 기존 규칙의 계산 결과(보임, 편집 가능, 탭 태그)를 구해서 그대로 권한 키로 바꿨다. rank가 같은 패턴은 지금 운영에서 실제로 나오는 순서로 고정했다.

이관이 맞는지는 별도 스크립트로 확인했다. 운영 사본을 임시 DB에 복사해 이관한 뒤, 역할 × 라우트 × 메서드 조합마다 기존 판정과 새 판정을 나란히 계산했다. 차이는 그냥 세지 않고 원인별로 분류했다.

| 분류 | 뜻 | 기대 |
|---|---|---|
| same | 결과 같음 | 대부분 |
| close.ui-hidden | 화면은 숨겼는데 API가 열려 있던 것 → 새 규칙에서 막힘 | 의도한 차이 |
| close.tab-hidden | 탭은 숨겼는데 API가 열려 있던 것 → 막힘 | 의도한 차이 |
| close.ui-readonly | 화면은 조회만인데 API 쓰기가 열려 있던 것 | 0이어야 함 |
| open.ui-shown-api-denied | 화면은 보이는데 API가 막혀 고장 나 있던 것 → 열림 | 의도한 차이 |
| diff.other | 그 밖 | 0이어야 함 |

분류를 나눈 이유는 "차이 0"이 목표가 아니었기 때문이다. 막혀야 할 것은 막히고, 열려야 할 것은 열려야 했다. 중요한 것은 **설명되지 않는 차이가 0**인 것이었다. 화면과 탭의 보임 여부는 차이 0건이었다. API 쪽 차이는 모두 위 분류 가운데 의도한 차이 세 가지에 들어갔다. 권한 상승 API(계정, 역할, 비밀번호 초기화, 권한 표 쓰기)는 따로 세어, 새 규칙에서는 관리자 역할만 부를 수 있는지 확인했다.

> [!TIP]
> 분류마다 "막는다/연다"를 결정 항목으로 따로 남겼다. 나중에 shadow 기록을 볼 때 "이 차이는 이미 결정한 것"인지 바로 판단할 수 있었다.

권한 상승 경로는 새 시스템 전환을 기다리지 않았다. 기존 운영 DB에 금지 패턴 몇 개를 더하는 긴급 조치 SQL과 되돌리기 SQL을 먼저 만들었다. 이 SQL도 같은 스크립트로 적용 전후를 비교했다. 화면 보임 변화 0, 화면에서 정당하게 쓰는 API가 막히는 경우 0을 확인하고 나서 사람이 실행했다.

## legacy → shadow → new

검증이 끝났다고 바로 새 규칙으로 막지는 않았다. 스크립트는 라우트 템플릿에 예시 값을 넣어 계산한다. 실제 사용자가 보내는 요청과는 다를 수 있다. 그래서 판정 모드를 환경변수 `PERM_MODE` 하나로 나눴다.

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

shadow 기록은 다음과 같이 남긴다.

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

이렇게 하면 표가 요청 수만큼 커지지 않는다. 운영 1~2주 동안 쌓인 행을 위 분류와 맞춰 보고, 결정한 분류 밖의 행이 없으면 `new`로 바꾼다. 되돌리기도 환경변수 하나로 된다.

> [!WARNING]
> shadow 기간에도 관리자는 기존 권한 화면에서 권한을 바꿀 수 있다. 그래서 `new`로 바꾸기 직전에 이관을 한 번 더 돌린다. 이때 새 관리 API로 누군가 이미 고친 행이 있으면 덮어쓰지 않고 멈추게 했다. 수정자 컬럼이 비어 있지 않은 행을 센다. 새 표에서 사람이 고친 값을 기계가 지우지 않게 하려는 것이다.

## 전환하며 발견한 것

**연산자 없는 패턴은 아무 데도 맞지 않았다.** `/assets`처럼 첫 글자가 `/`인 패턴이 있었다. `/`가 연산자 자리로 읽히니 어떤 경로와도 맞지 않는다. 화면은 보이는데 API는 막혀서 그 화면이 고장 나 있었다. 동등성 분류에서 `open.ui-shown-api-denied`로 드러났다.

**저장 쿼리가 컬럼 두 개를 바꿔 넣고 있었다.** 패턴을 등록하는 SQL이 태그와 설명을 뒤바꿔 저장했다. 어떤 패턴은 탭 태그 자리에 설명 문구가 들어가 있었다. 새 판정은 카탈로그 이름만 쓰기 때문에 영향이 없었다.

**"아직 열지 않은 화면 금지" 패턴이 이관 결과를 0으로 만들었다.** 기존에는 준비 중인 화면을 막는 금지 패턴이 있었다. "지금 보이는 대로" 옮기니 그 화면들은 관리자에게도 권한이 0개였다. 새로 연 화면은 명시적으로 권한을 주는 마이그레이션을 따로 만들었다. 이관을 다시 돌려도 그 값이 유지되게 했다.

**shadow 동안에는 새 화면을 마음대로 열 수 없다.** 기존 규칙이 실제 판정을 하기 때문에, 기존 규칙에 없는 새 화면의 API는 shadow 동안 관리자만 통과하게 했다. 새 기능을 다른 역할에게 열려면 `new` 전환을 기다려야 했다. 일정에 미리 넣어야 하는 제약이었다.

**"처음 한 번만" 실행하는 권한 부여가 건너뛰어졌다.** 권한을 기본으로 주는 마이그레이션은 이미 실행했는지를 키로 기록한다. 그런데 서로 다른 브랜치의 마이그레이션 두 개가 같은 번호를 썼다. 실행 기록 키가 겹쳐 하나가 건너뛰어졌다. 번호를 바꾸고 다시 적용했다.

## 정리

- 레거시 권한을 옮길 때 "똑같이"는 목표가 될 수 없다. 기존 구멍까지 옮겨지기 때문이다. 대신 차이를 원인별로 분류하고, 분류마다 결정을 남겼다.
- 권한 키를 코드의 카탈로그로 만들었다. 라우트 선언 누락은 빌드에서, 없는 키는 저장할 때 막힌다.
- 검증 스크립트로 충분하지 않은 부분은 shadow 단계로 메웠다. 실제 요청으로 두 규칙을 같이 돌리되, 다를 때만 (역할, 메서드, 경로) 단위로 한 줄씩 기록했다.
- 긴급한 보안 문제는 전환을 기다리지 않고 기존 시스템에 먼저 조치했다. 조치도 같은 비교 스크립트로 확인했다.

남은 일은 shadow 기록을 확인하고 `new`로 전환하는 것이다. 그 결과는 전환한 뒤에 따로 정리하려고 한다.
