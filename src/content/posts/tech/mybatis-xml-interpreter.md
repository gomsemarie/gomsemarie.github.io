---
title: "MyBatis 매퍼 XML을 TypeScript에서 그대로 실행하는 해석기"
description: "Java ERP의 SQL 429개를 TypeScript로 다시 쓰지 않으려고 매퍼 XML을 읽어 실행하는 해석기를 만들었다. 기존 XML에 쓰인 태그만 지원하고 모르는 태그는 오류를 내게 했으며, SQL이 같아도 달랐던 결과는 Java DTO의 형 규칙을 자동으로 적용해 맞췄다."
date: 2026-10-07
category: "Tech/TypeScript"
tags: ["mybatis", "typescript", "postgresql", "migration", "sql"]
series: "레거시 ERP 이관기"
seriesOrder: 3
---

회사 ERP의 Java API를 TypeScript로 옮기면서 가장 먼저 정한 규칙은 SQL을 손대지 않는 것이었다. 기존 API는 Spring Boot + MyBatis였고, 매퍼 XML 안에 SQL 문장이 429개 있었다. 이걸 사람이든 AI든 손으로 옮기면 어딘가에서 조건 하나, 형 변환 하나가 어긋난다. 그 차이를 찾는 데 드는 시간이 옮기는 시간보다 길다.

그래서 매퍼 XML 파일을 그대로 가져와서 런타임에 읽고, 실행할 수 있는 SQL로 바꾸는 해석기를 만들었다. 코드는 AI 코딩 에이전트가 썼고, 본체는 200줄이 안 된다. 아래는 해석기의 범위를 정한 방법과, SQL만 같아서는 결과가 같지 않았던 이유다.

## 기존 XML에 쓰인 문법만 지원

MyBatis 동적 SQL 문법은 많다. `<where>`, `<set>`, `<trim>`, `<foreach>`, `<bind>`, OGNL 식까지 다 지원하면 MyBatis를 다시 만드는 일이 된다. 기존 XML을 먼저 훑어서 실제로 쓰인 것만 골랐다.

- `<include refid>`: 공용 `<sql>` 조각 끼워 넣기
- `<if test>`
- `<choose>` / `<when>` / `<otherwise>`
- `<selectKey>`, `useGeneratedKeys`: 등록 후 키 받기
- `#{경로}`, `#{경로, jdbcType=...}`: 바인드 변수
- `${...}`: 정렬 컬럼과 방향에만

`test` 식도 마찬가지였다. 기존 XML에 나오는 모양은 `a != null and a != ''`, `a == '01'`, `a eq '1'.toString()` 정도라서, 이 모양만 정규식으로 받는다.

```ts title="condition.ts"
// "a != null and a != ''" · "a == '01'" · "a eq '1'.toString()" 만 받는다
export function evalTest(expr: string, params: unknown): boolean {
  return expr.split(/\s+and\s+/).every((clause) => {
    const m = clause.trim().match(/^([\w.]+)\s*(!=|==|eq|neq)\s*(null|'[^']*'(?:\.toString\(\))?)$/);
    if (!m) throw new Error(`지원하지 않는 test 식: ${expr}`);
    const v = readPath(params, m[1]);
    const rhs = m[3] === "null" ? null : m[3].slice(1, m[3].indexOf("'", 1));
    const eq = rhs === null ? v == null : v != null && String(v) === rhs;
    return m[2] === "!=" || m[2] === "neq" ? !eq : eq;
  });
}
```

`String(v) === rhs`로 비교한 데는 이유가 있다. 기존 식 `dvsnCd eq '1'.toString()`은 값이 문자열 `'1'`이든 숫자 `1`이든 참이었고, 이 동작을 그대로 따랐다.

## 구조

XML은 `fast-xml-parser`로 읽는다. 텍스트와 태그의 순서가 유지되려면 `preserveOrder: true`로 두어야 한다. SQL은 순서가 바뀌면 뜻이 달라지므로 이 옵션은 빼면 안 된다.

```ts title="mapper-loader.ts (원리만 다시 쓴 예시)"
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "",
  trimValues: false, cdataPropName: "#cdata", processEntities: true,
});

const fragments = new Map<string, Node[]>();  // <sql id> 조각
const statements = new Map<string, Statement>(); // namespace.id → 문장

export function loadMapper(xml: string) {
  const doc = parser.parse(xml);
  const mapper = doc.find((n: any) => "mapper" in n);
  const ns = mapper[":@"].namespace;
  for (const n of mapper.mapper) {
    const tag = tagOf(n);
    if (!tag || tag.startsWith("#")) continue;
    const attrs = n[":@"] ?? {};
    if (tag === "sql") fragments.set(`${ns}.${attrs.id}`, n[tag]);
    else if (["select", "insert", "update", "delete"].includes(tag)) statements.set(`${ns}.${attrs.id}`, { kind: tag, attrs, body: n[tag] });
    else throw new Error(`지원하지 않는 최상위 태그 <${tag}>`);
  }
}
```

문장을 부르면 본문을 재귀로 훑으며 SQL 조각을 모은다. 텍스트 안의 `#{경로}`는 PostgreSQL 위치 파라미터(`$1`, `$2` ...)로 바꾸고 값은 배열에 쌓는다. 결과는 `pg`에 그대로 넘길 수 있는 `{ text, values }`다.

```ts title="render.ts (원리만 다시 쓴 예시)"
function render(body: Node[], params: unknown, out: { sql: string[]; values: unknown[] }) {
  for (const n of body) {
    const tag = tagOf(n);
    if (tag === "#text") { out.sql.push(bindText(n["#text"], params, out)); continue; }
    const attrs = n[":@"] ?? {};
    if (tag === "include") render(mustFragment(attrs.refid), params, out);
    else if (tag === "if") { if (evalTest(attrs.test, params)) render(n.if, params, out); }
    else if (tag === "choose") {
      const hit = n.choose.find((k: Node) => tagOf(k) === "when" && evalTest(k[":@"].test, params))
        ?? n.choose.find((k: Node) => tagOf(k) === "otherwise");
      if (hit) render(hit[tagOf(hit)], params, out);
    }
    else if (tag === "selectKey") { /* 문장 실행 전후에 따로 돌린다 */ }
    else throw new Error(`지원하지 않는 태그 <${tag}>`);
  }
}
```

## 모르는 태그는 바로 오류

`render`의 마지막 줄은 모르는 태그를 만나면 건너뛰지 않고 예외를 던진다. 이 해석기에서 제일 신경 쓴 부분이다.

건너뛰어도 SQL은 만들어지지만, 조건 하나가 빠진 SQL이 된다. `<where>` 안의 조건이 통째로 사라지면 조회는 성공하고 전체 행을 돌려준다. 이런 오류는 화면에서도 로그에서도 보이지 않는다. 그래서 틀린 SQL을 조용히 만드는 대신 실행을 멈추게 했다.

이 동작은 테스트로 고정했다. 매퍼 폴더의 모든 문장을 빈 파라미터, 페이징·정렬 파라미터의 두 가지 입력으로 컴파일해 본다. 429개 × 2 = 858번이 모두 성공해야 통과한다. 누군가 XML에 새 문법을 쓰면 이 테스트가 먼저 깨진다.

## SQL이 같아도 형이 다르면 결과가 다르다

SQL이 같아도 결과가 같지 않았다. 원인은 형이었다.

기존 API에서는 요청 본문이 Java DTO로 바인딩되는데, 이 과정에서 여러 일이 일어난다.

- DTO에 없는 필드는 버려진다.
- `int`, `double`, `boolean` 같은 기본형은 값이 없으면 `0`이나 `false`가 된다. 필드에 초기값이 있으면 그 값이 된다.
- JDBC는 Java 형에 맞춰 파라미터 형을 정한다. `Integer`는 `int4`, `Double`은 `float8`, `BigDecimal`은 `numeric`이다.
- 응답도 DTO 필드만 나간다. 숫자 컬럼을 `String` 필드로 받으면 문자열이 된다.

JavaScript 객체로 그냥 넘기면 이 규칙이 모두 빠진다. 그래서 기존 Java 소스에서 DTO 정보를 뽑아 JSON으로 만들었다. `parity/gen-dto.mjs`가 Java 파일을 읽어 클래스마다 필드 이름, 형, 초기값, 상속 관계를 모은다. 정식 파서는 쓰지 않고, 주석과 어노테이션을 걷어 낸 뒤 필드 선언을 정규식으로 찾는다. 여러 줄에 걸친 어노테이션 안의 괄호나 문자열 속 `//`까지 고려해야 했다. 기존 소스는 동결 상태라 한 번 만들면 다시 돌릴 일이 거의 없다.

같은 스크립트가 매퍼 인터페이스의 메서드 반환형도 뽑는다. XML에 `resultType`이 없는 select는 MyBatis가 Java 메서드 반환형을 보고 결과를 만든다. 반환형이 `long`이면 첫 컬럼 값 하나, DTO면 행마다 DTO 모양이다. 응답 JSON이 같으려면 이 규칙도 같아야 한다.

```ts title="dto-cast.ts (원리만 다시 쓴 예시)"
const JAVA_TO_PG: Record<string, string> = {
  String: "::varchar", int: "::int4", Integer: "::int4", long: "::int8", Long: "::int8",
  double: "::float8", Double: "::float8", BigDecimal: "::numeric", boolean: "::bool",
};

// 바인딩할 때 필드별 Java 형을 Symbol 속성에 남긴다. { ...dto } 로 펼쳐도 따라간다
export const JAVA_TYPES = Symbol("javaTypes");

function castFor(owner: unknown, field: string, value: unknown) {
  const t = (owner as any)?.[JAVA_TYPES]?.[field];
  if (t && JAVA_TO_PG[t] && value != null) return JAVA_TO_PG[t];
  if (typeof value === "string") return "::varchar";
  if (typeof value === "number") return Number.isInteger(value) ? (Math.abs(value) <= 2 ** 31 - 1 ? "::int4" : "::int8") : "::numeric";
  return "";
}
```

`#{reqDto.amount}`를 만나면 `reqDto`의 형 정보에서 `amount`의 Java 형을 찾아 `$3::float8`처럼 형 변환을 붙인다. 형 정보가 없는 값은 JavaScript 값 모양을 보고 정한다. 처음에는 형 정보를 `WeakMap`에 두었다가, 객체를 펼치면 정보가 사라져 .5 반올림이 달라지는 버그를 겪었다. 이 일은 [대조 테스트 글](/posts/erp-parity-testing/)에 적었다.

> [!NOTE]
> 기존 DTO에 버그가 있는 곳도 있었다. SQL이 쓰는 필드가 DTO 클래스에 없어서 기존 API가 늘 500을 내던 곳이다. 자동 생성한 JSON은 고치지 않고, 수정용 목록을 따로 두어 필드를 더했다. 생성물은 원본과 같게 두고 고친 내용은 한곳에 모아 두어야 나중에 추적할 수 있다.

## 기존 SQL을 고쳐야 할 때

SQL을 손대지 않는다는 규칙에도 예외가 있다. 기존 버그를 고치기로 결정한 경우다. 이때는 XML을 직접 고치고, 고친 줄에 `기존 버그 수정(날짜)` 주석과 이유를 단다. 이런 곳들이었다.

- 조건식 오타로 늘 `ELSE`로 빠지는 바람에, 제목이 비어 있는 행이 목록에서 사라지던 곳
- 수정자 컬럼에 로그인 사용자 대신 작성자 ID를 넣던 곳

주석 형식을 하나로 정해 두어서 `grep` 한 번으로 고친 곳을 모두 볼 수 있다. 무엇을 왜 바꿨는지는 따로 둔 백엔드 이슈 문서에 결정과 함께 남겼다.

빈 문자열을 날짜로 바꾸는 문제는 XML 대신 해석기에서 고쳤다. 화면은 빈 날짜를 `''`로 보내는데, SQL이 `#{x}::DATE`이면 PostgreSQL은 늘 오류를 낸다. 바인드 변수 바로 뒤에 날짜·숫자 형 변환이 붙어 있으면 해석기가 `''`를 `null`로 넘기게 했다. `NULLIF(#{x}, '')::DATE`와 같은 효과다. 원래 오류가 나던 경우만 바뀌므로 정상 동작에는 영향이 없다.

## `${}`는 정렬에만

MyBatis의 `#{}`는 바인드 변수지만 `${}`는 문자열을 SQL에 그대로 끼워 넣는다. 기존 XML에서 `${}`는 정렬 컬럼과 정렬 방향 두 곳에만 쓰였다. 해석기는 이 두 경로만 받고, 값의 모양도 검사한다.

```ts title="raw-param.ts"
function rawParam(path: string, params: unknown): string {
  const v = String(readPath(params, path) ?? "");
  if (path === "pageable.sortMethod" && /^(ASC|DESC)$/i.test(v)) return v.toUpperCase();
  if (path === "pageable.sortKey" && /^[a-z_][a-z0-9_]*$/.test(v)) return v;
  throw new Error(`허용되지 않는 \${${path}} 값`);
}
```

테스트에는 `x; drop table y` 같은 정렬 값을 넣어 예외가 나는지 확인하는 항목도 두었다.

> [!WARNING]
> `${}`에는 SQL 주입이 그대로 통한다. 해석기를 만들 때 `${}`를 "값을 문자열로 바꿔 넣기"로 일반화해서 구현하면 기존 XML의 모든 `${}`가 공격 지점이 된다. 허용할 경로를 이름으로 고정하고, 값은 식별자나 `ASC`/`DESC` 같은 좁은 모양만 받아야 한다. 컬럼 이름 검사는 형식만 보므로, 가능하면 허용 컬럼 목록과도 맞춰 보는 편이 더 안전하다.

## 정리

- SQL 429개를 다시 쓰지 않고, 매퍼 XML을 런타임에 읽어 실행하는 작은 해석기를 만들었다.
- 기존 XML에 실제로 쓰인 태그와 식만 지원했다. 모르는 태그는 바로 오류를 내고, 모든 문장을 컴파일하는 테스트로 고정했다.
- SQL이 같아도 형이 다르면 결과가 달랐다. 기존 Java 소스에서 DTO 필드·형·초기값과 매퍼 반환형을 뽑아 바인딩과 응답에 자동 적용했다.
- 기존 SQL은 버그를 고친 곳만 손댔고, 정해진 주석을 달아 한 번에 찾을 수 있게 했다.
- `${}`는 정렬 두 곳만 허용하고 값의 모양을 검사했다.
