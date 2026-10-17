---
title: "읽은 것으로 다시 짓지 않는다: 레거시 화면 정의 파일을 무손실로 고쳐 쓰기"
description: "레거시 화면 정의 파일의 그리드 셀 몇 칸을 바꿔야 했다. 파싱 결과로 다시 조립하면 모르는 값이 사라지고 손대지 않은 셀의 줄바꿈까지 바뀌어서, 원문 위에 slice로 끼워 쓰는 방식을 택했다."
date: 2026-10-17
category: "Tech/Node"
tags: ["typescript", "node", "file-format", "xml", "testing"]
series: "사내 변환 도구 개발기"
seriesOrder: 6
draft: true
---

## 고칠 것은 셀 몇 칸이었다

옛 화면을 새 화면으로 옮기면 그리드의 콤보박스 열도 같이 옮겨야 한다. 콤보 목록을 어느 ini 파일의 어느 섹션에서 가져올지가 바뀌기 때문이다. 그 정보는 레거시 화면 정의 파일 안에 들어 있다. 화면 정의는 XML 모양의 `property` 문자열이고, 그 안의 `<sub name="…" value="…"/>` 하나의 값이 다시 제어문자로 구분된 레코드 묶음이다.

```text title="콤보 열 정의 값의 모양"
<매직> US <레코드…> US <빈칸> GS <매직> US <레코드…> US <빈칸> GS
```

`US`는 U+001F, `GS`는 U+001D다. `GS`는 구분자가 아니라 종결자라서 마지막 그룹 뒤에도 붙는다. 앞의 매직 값이 레코드 길이를 정한다. 체크박스 그룹은 6칸, 콤보박스 그룹은 8칸이다.

바꿔야 하는 것은 콤보 레코드 8칸 중 ini 경로, 섹션, 목록 정도였다. 읽는 쪽은 이미 있었으니, 처음 떠오르는 방법은 읽은 객체를 고쳐서 다시 직렬화하는 것이다. 동료가 이 되쓰기를 AI 코딩 에이전트와 함께 만들면서 그 방법이 왜 안 되는지를 실측으로 확인했고, 결국 원문 위에 끼워 쓰는 방식으로 짰다. 나는 그 위에 콤보 값 비교 화면과 되쓰기 경로를 얹었다. 이 글은 그 판단을 정리한 것이다.

## 대칭으로 짜면 생기는 두 가지 문제

### 모르는 매직 값이 사라진다

읽기는 너그럽게 짜 두었다. 모르는 매직이 나오면 그 그룹만 건너뛴다. 그룹 하나를 모른다고 그리드 전체를 포기하면 잃는 게 더 크기 때문이다.

그런데 읽은 결과로 다시 지으면, 읽지 않은 그룹은 아예 없어진다. 실측해 보니 재조립하면 그룹이 3개에서 2개로 줄었고, 끼워 쓰기는 3개가 그대로 남았다. 읽을 때의 너그러움이 쓸 때는 삭제가 된다.

### XML 파서가 CRLF를 LF로 바꾼다

XML 표준은 파서가 줄바꿈을 정규화하도록 정해 둔다. 실측한 화면 하나는 `property` 원문에 CR이 3개 있었는데 파서를 거친 값에는 0개였다. 파싱된 값으로 다시 쓰면 그 `property` 안의 목록이 전부 바뀐다. 건드리지 않기로 한 셀까지 바뀌는데 오류는 나지 않는다.

> [!WARNING]
> 둘 다 조용히 일어난다. 저장은 성공하고, 화면도 대체로 그럴듯하게 뜬다. 무엇이 사라졌는지는 원문과 바이트 단위로 비교해야만 드러난다.

## 오프셋을 세고 slice로 끼운다

그래서 읽기와 쓰기를 대칭으로 만들지 않았다. `split`은 오프셋을 셀 때만 쓰고, 편집은 `원문.slice(0, 시작) + 새 값 + 원문.slice(끝)`으로 한다. `join`은 하지 않는다. `[start, end)` 바깥은 바뀔 수가 없다. 조심해서 안 바뀌는 게 아니라 `slice`가 원래 그렇게 동작한다.

```ts title="splice-record.ts"
const US = "\u001f";
const GS = "\u001d";
const RECORD_SIZE = new Map([["CHECK", 6], ["COMBO", 8]]);

type Span = { start: number; end: number; text: string };

/** 그룹과 칸을 나누되, 칸마다 원문 기준 절대 위치를 같이 남긴다 */
function* records(value: string) {
  let base = 0;
  for (const group of value.split(GS)) {
    const groupStart = base;
    base += group.length + 1;
    if (group === "") continue;

    const spans: Span[] = [];
    let cur = groupStart;
    for (const part of group.split(US)) {
      spans.push({ start: cur, end: cur + part.length, text: part });
      cur += part.length + 1;
    }
    const size = RECORD_SIZE.get(spans[0]!.text);
    if (size === undefined) continue; // 모르는 그룹은 지나가기만 한다. 글자는 그대로 남는다

    const body = spans.slice(1);
    for (let i = 0; i + size <= body.length; i += size) {
      yield { magic: spans[0]!.text, fields: body.slice(i, i + size) };
    }
  }
}

/** 오른쪽부터 끼운다. 왼쪽부터 넣으면 뒤 칸의 오프셋이 밀린다 */
function spliceAll(value: string, patches: { start: number; end: number; text: string }[]) {
  let next = value;
  for (const p of [...patches].sort((a, b) => b.start - a.start)) {
    next = next.slice(0, p.start) + p.text + next.slice(p.end);
  }
  return next;
}
```

모르는 그룹은 건너뛰기만 하니 원문에 그대로 남는다. CR도 원문 문자열에서 바로 자르니 살아 있다. 위의 두 문제가 같은 방법으로 함께 풀린다.

바깥 껍데기도 같은 방식이다. `property` 안에서 해당 `<sub>`의 `value="…"` 안쪽 구간을 정규식 하나로 찾고, 그 구간만 바꾼다. 태그를 다시 조립하지 않는다. 원문에는 `/>` 앞에 공백이 있는 태그도 있어서, 다시 조립하면 그런 버릇이 사라진다. 미리보기에 보여 주는 바꾸기 전후 `<sub>` 태그도 원문에서 잘라 낸다. 보여 주는 것과 보내는 것이 다르면 미리보기를 둘 이유가 없다.

## 여는 칸은 좁게, 넣는 글자는 까다롭게

콤보 레코드 8칸 중 고칠 수 있게 연 칸은 넷뿐이다. 코드 길이, 목록, ini 경로, ini 키다. 행·열은 위치라서 바꿀 대상이 아니다. "키값 표시 안 하기" 칸은 뜻이 확실하지 않고, 마지막 칸은 늘 `0`이다. 이런 칸은 열어 두면 언젠가 누가 값을 넣는다. 모르는 칸을 건드리지 않는 것이 이 코드가 안전하다고 말할 수 있는 근거다.

새 값에 들어가면 거절하는 글자가 셋이다.

- `US`, `GS`: 이 둘은 이스케이프 방법이 없다. 값에 들어가면 그 자리가 곧 경계가 된다. 칸이 하나 늘고 뒤 레코드가 통째로 밀린다.
- 큰따옴표: XML 속성을 그 자리에서 끊는다.

세 경우 모두 밀린 결과가 그럴듯해 보여서 눈으로 찾기 어렵다. 반대로 `&`는 막지 않았다. XML 규칙대로라면 이스케이프해야 하지만, 실제 화면의 캡션에 "매출&매입" 같은 값이 그대로 들어 있고 기존 파서도 멀쩡히 읽는다. 규격보다 실물을 따랐다.

그 밖에도 애매하면 거절한다. 그 위치에 콤보가 없으면 거절한다. 같은 위치가 두 번 나오면 무엇을 바꿀지 우리가 정할 수 없으니 거절한다. 여러 셀 중 하나라도 틀리면 전부 거절한다.

> [!NOTE]
> 거절 조건 하나는 나중에 걷어냈다. 레코드 뒤에 남는 꼬리 칸이 1칸보다 길면 거절했는데, 화면 정의 파일 표본은 꼬리가 1칸이어도 실제 서버 응답은 2칸이었다. 멀쩡한 화면을 막고 있었다. 지금은 레코드를 하나라도 온전히 읽었는지만 본다.

## 검산은 원문끼리 한다

끼운 뒤에는 다시 읽어서 대조한다. 그룹 수가 같은지, 콤보 레코드의 위치 순서가 같은지 본다. 하나라도 다르면 값을 내놓지 않는다.

```ts title="verify.ts"
function verify(before: string, after: string): boolean {
  if (before.split(GS).length !== after.split(GS).length) return false;
  const a = [...records(before)].filter((r) => r.magic === "COMBO").map(placeOf);
  const b = [...records(after)].filter((r) => r.magic === "COMBO").map(placeOf);
  return a.join("|") === b.join("|");
}
const placeOf = (r: { fields: Span[] }) => `${r.fields[0]!.text},${r.fields[1]!.text}`;
```

비교 대상은 원문 문자열이다. 파싱된 값끼리 비교하면 CRLF가 양쪽에서 똑같이 지워져서 차이가 보이지 않는다. 검산은 통과하는데 값은 망가진 상태가 된다. 구간을 일부러 한 글자 어긋나게 잡아 보는 시험도 넣었다. 그러면 레코드 수와 위치 순서가 바로 깨진다. 오프셋이 틀렸는데 그냥 지나가는 경우는 없다.

## 시험: 골든 픽스처와 무손실 왕복

읽기 쪽은 원래 쓰던 파서의 출력을 골든 픽스처로 남겨 두고 그것과 맞춰 본다. 되쓰기 시험은 실물 화면에서 옮겨 온 값, CRLF가 든 목록까지 그대로 넣어서 돌린다. 이 시험의 요점은 "바꾼 값이 맞는가"보다 "안 바꾼 것이 그대로인가"다. 그래서 시험 이름도 대부분 지켜야 할 성질 그대로다.

- 안 건드린 레코드가 글자 하나까지 같다
- CR이 살아 있다
- 모르는 매직 그룹이 그대로 남는다
- 체크박스 그룹이 앞에 와도 뒤의 콤보를 제대로 짚는다
- 날 `&`는 통과시킨다, 개행도 통과시킨다

마지막 관문은 서버를 한 바퀴 도는 시험이다. 화면을 받아서 아무것도 바꾸지 않고 같은 값을 다시 보낸 뒤, 다시 받아서 `property`가 글자 하나까지 같은지 본다. 이 시험이 통과하기 전에는 실제 값을 쓰지 않기로 했다.

```ts title="roundtrip.test.ts"
test("아무것도 안 바꾸고 되돌려 보내면 property가 글자 하나까지 같다", async () => {
  const before = await getScreen();
  const target = before.controls.find((c) => c.property.includes("<sub"));
  assert.ok(target);

  await postScreen(before, { [target.name]: target.property }); // 같은 값을 다시 넣는다

  const after = await getScreen();
  const back = after.controls.find((c) => c.name === target.name);
  assert.equal(back?.property, target.property);
});
```

기본 주소는 목업 서버다. 실제 서버를 실수로 호출하면 남의 화면을 덮어쓸 수 있다. 다른 곳을 보려면 환경 변수로 일부러 지정해야 한다.

## 내가 얹은 것

이 위에 콤보 값을 옛 화면과 비교해 새 화면에 되쓰는 기능을 만들면서 두 가지를 더했다. 둘 다 같은 원칙을 따른다.

첫째, 없는 `<sub>`를 맨 뒤에 붙일 수 있게 했다. 원래는 금지였다. 태그의 `type` 코드를 몰랐고, 모르는 값을 지어내면 근거 없는 값이 남의 화면에 들어가기 때문이다. 실물에서 `type` 코드를 확인한 이름 다섯 개만 허용했다. 붙이는 것도 자르지 않고 끼우는 방식이라 다른 태그는 다치지 않는다.

둘째, 자기 검산이 값 앞뒤 공백은 무시하게 했다. XML 파서가 잘라 내는 자리라서, 이걸 무시하지 않으면 끝에 개행이 있는 값은 한 번도 올라가지 못했다.

## 정리

- 읽기를 너그럽게 짰다면, 그 결과로 다시 지으면 안 된다. 읽지 않고 건너뛴 것이 쓰기에서는 삭제가 된다.
- XML 파서는 줄바꿈을 정규화한다. 파싱된 값으로 되쓰면 손대지 않은 셀까지 바뀐다.
- 원문 오프셋을 세고 `slice`로 끼우면 구간 밖은 바뀔 수 없다. 여러 군데는 오른쪽부터 끼운다.
- 고칠 칸은 필요한 만큼만 열고, 구분자와 따옴표가 든 값은 거절한다. 애매하면 전부 거절한다.
- 검산은 파싱된 값이 아니라 원문끼리 한다. 아무것도 안 바꾼 왕복이 글자 하나까지 같아야 실제 값을 쓴다.
