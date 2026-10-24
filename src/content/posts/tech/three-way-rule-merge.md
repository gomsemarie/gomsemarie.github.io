---
title: "현장에서 고친 룰과 새 배포본을 3-way로 견줘 합치기"
description: "새 배포본이 폐쇄망 현장에서 고친 룰을 덮지 않도록, 기준선·현장·반입본 세 점을 비교해 여덟 갈래로 판정하게 했다. 기준선은 해시 지문 대신 받을 당시의 원문으로 .base/에 남기고, 어떤 룰이 있는지는 폴더 스캔이, 순서는 기록 파일이 정하게 나눴다."
date: 2026-08-16
category: "Tech/Node"
tags: ["node", "typescript", "merge", "airgap", "file-system"]
series: "사내 변환 도구 개발기"
seriesOrder: 7
---

## 배포 한 번에 현장 작업이 날아간다

변환 룰은 서버의 룰 폴더 하나에 들어 있다. 폐쇄망 현장에서는 이 룰을 고치기도 하고 새로 만들기도 한다. 그런데 새 버전을 배포하면서 이 폴더를 덮어쓰면 현장에서 한 작업이 한꺼번에 사라진다.

그래서 새 버전의 룰은 바로 덮지 않고 `rules-incoming/`에 따로 둔다. 무엇을 받을지는 관리자가 파일마다 고른다. 문제는 그 화면이 무엇을 묻고 무엇은 묻지 말아야 하느냐였다.

## 처음 판정은 두 점만 봤다

처음에는 룰을 받을 때 그 내용의 sha1 지문을 기록해 두고, 판정할 때 이 지문을 현장 파일하고만 비교했다.

```ts title="classify-v1.ts (처음 판정)"
const base = state.accepted[name];
st = base !== undefined && base === fingerprint(here) ? "changed" : "both";
```

반입본은 한 번도 비교하지 않았다. 그래서 새 버전이 손대지 않은 파일이라도 현장에서 고쳤으면 `both`(양쪽이 고침)로 나왔다. `both`는 설계상 일괄 처리에서 빠지고 기본값도 없다. 배포할 때마다 현장에서 고친 룰 개수만큼 손으로 골라야 했고, 하나라도 빠뜨리면 [적용] 버튼이 켜지지 않았다.

문제가 하나 더 겹쳐 있었다. "내 것 유지"를 골라도 아무 기록이 남지 않았다. 받기를 고른 경우에만 지문을 갱신했기 때문이다. 그래서 이런 일이 반복됐다.

> 현장에서 룰 하나를 고친다 → 배포마다 `양쪽이 고침`으로 뜬다 → "내 것 유지"를 고른다 → 다음 배포에 또 뜬다

## 세 점을 비교하는 여덟 갈래

기준선(받았을 때), 현장(`rules/`), 반입본(`rules-incoming/`) 셋을 비교하도록 바꿨다.

| 현장 | 반입본 | 기준선과의 관계 | 판정 | 사람 손 |
|:---:|:---:|---|---|---|
| ○ | ○ | 현장 = 반입본 | `same` 같음 | — |
| ○ | ○ | 기준선 = 현장, ≠ 반입본 | `changed` 새 버전이 고침 | 받기(기본 켬) |
| ○ | ○ | 기준선 ≠ 현장, = 반입본 | `kept` 현장에서 고침 | 묻지 않음 |
| ○ | ○ | 기준선 ≠ 양쪽, 또는 기준선 없음 | `both` 양쪽이 고침 | 사람 |
| ○ | ✕ | — | `mine` 현장에만 있음 | — |
| ✕ | ○ | 지웠음, 기준선 ≠ 반입본 | `deleted` 지웠는데 있음 | 사람 |
| ✕ | ○ | 지웠음, 기준선 = 반입본 | `dropped` 지운 채로 둠 | 묻지 않음 |
| ✕ | ○ | 지운 적 없음 | `added` 새로 들어옴 | 받기(기본 켬) |

첫 번째 문제는 `kept`로 풀린다. 반입본이 기준선에서 달라지지 않았으니 물어볼 것이 없다. `dropped`는 설계 문서를 쓸 때는 빠뜨렸다가 구현 계획을 짜면서 찾았다. 지운 룰이 배포마다 계속 들어오면, "지운 채로 둔다"를 골라도 다음 배포에서 또 물었다. 원리는 `kept`와 같다. 이 배달본을 이미 보고 결정했다는 사실이 남아 있으면 다시 묻지 않는다.

```ts title="classify.ts"
function classify(here: string | undefined, next: string, base: Baseline, deleted: boolean): State {
  if (here === undefined) {
    if (!deleted) return "added";
    return base.same(next) ? "dropped" : "deleted";
  }
  // 둘이 같은지를 먼저 본다. 뒤로 미루면 기준선이 없는 첫 배포에서
  // 내용이 똑같은 파일까지 both로 떨어진다
  if (fingerprint(here) === fingerprint(next)) return "same";

  const hereUnchanged = base.same(here);
  const nextUnchanged = base.same(next);
  if (!hereUnchanged && !nextUnchanged) return "both"; // 기준선을 모를 때도 여기로 온다
  if (!hereUnchanged) return "kept";
  return "changed";
}
```

기준선이 없으면 `same()`은 항상 `false`를 돌려준다. 그래서 기준선을 모르는 파일은 자연스럽게 `both`나 `deleted`로 가서 사람에게 묻게 된다. 기준선이 없는 경우를 따로 처리하지 않은 이유다. 말없이 덮었다가 현장 작업을 날리는 것보다 한 번 더 묻는 편이 비용이 적다.

두 번째 문제는 받아들임의 뜻을 바꿔서 풀었다. 판단을 내린 파일은 결과와 관계없이 기준선을 그 배달본으로 갱신한다. 받기를 고르든 유지를 고르든 똑같다. 기준선의 뜻이 "마지막으로 받아들인 내용"에서 "마지막으로 판단을 내린 배달본"으로 바뀌었다. 파일을 지울 때도 기준선은 지우지 않는다. 지우면 이미 보고 지운 배달본이 다음 배포에서 `지웠는데 있음`으로 다시 뜬다.

## 지문 대신 원문을 남긴다

판정만 보면 지문으로도 할 수 있었다. 하지만 지문은 40글자로 같은지 다른지만 알려 준다. 사람이 `양쪽이 고침`을 판단하는 자리에서는 누가 어느 줄을 고쳤는지 보여야 하는데, 지문으로는 그걸 보여 줄 수 없다.

시간 문제도 있었다. `rules-incoming/`은 다음 배포 때 통째로 바뀐다. 지문만 들고 있으면 배포가 한 번 지나간 뒤에는 그 배달본의 원문이 어디에도 남지 않는다. 그래서 받을 당시의 원문을 `rules/.base/`에 그대로 두기로 했다. 룰 32개에 185KB 정도라 부담은 없었다. JSON 안에 본문을 넣지 않고 파일로 둔 것은 diff 도구로 바로 열어 볼 수 있어서다.

```ts title="baseline-store.ts"
async function read(name: string): Promise<string | null> {
  try {
    return await readFile(path.join(dir, ".base", name), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; // 아직 안 받은 파일
    throw e; // 권한 문제나 파일 자리에 폴더가 있는 경우는 설정 오류다
  }
}

async function put(name: string, code: string) {
  const target = path.join(dir, ".base", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target + ".tmp", code, "utf8"); // 옆에 쓰고 바꿔 끼운다
  await rename(target + ".tmp", target);
}
```

`ENOENT`만 "없음"으로 보고 나머지 오류는 던진다. 오류를 모두 삼키면 멀쩡한 기준선이 소리 없이 사라지고, 현장에서 며칠 걸려 고친 룰이 `양쪽이 고침` 더미에 섞인다. 쓸 때는 임시 파일에 쓴 뒤 `rename`한다. 쓰다 만 기준선이 남으면 그 파일은 계속 `양쪽이 고침`으로 뜬다.

이 전환은 단계를 나눠 진행했다. 먼저 아무도 쓰지 않는 `.base/` 자리만 만들고, 다음 단계에서 판정이 지문 대신 원문을 보게 바꿨다. 여덟 갈래의 뜻은 하나도 바꾸지 않았다. 바꾼 뒤에도 보호가 그대로인지는 돌연변이 시험으로 확인했다. 판정이 기준선을 보지 않게 일부러 망가뜨렸을 때, 바꾸기 전에는 시험 5건이 깨졌고 바꾼 뒤에는 같은 5건에 새로 넣은 CRLF 시험까지 6건이 깨졌다. 실제 룰 폴더로도 돌려 봤다. 기존 기록을 옮기는 작업으로 32건을 건진 뒤 판정해 보니 32건 모두 `same`이었다. 사본에서 룰 하나를 고치면 `kept`가 하나 나왔고, CRLF로 저장한 룰은 그대로 `same`이었다.

## 줄바꿈은 정규화해서 비교한다

윈도우에서 룰 파일을 열었다가 저장하기만 해도 줄바꿈이 CRLF로 바뀔 때가 있다. 바이트로 비교하면 그런 파일이 전부 `양쪽이 고침`으로 뜬다. 아무 뜻 없는 diff를 스무 개씩 보다 보면 진짜 변경 하나를 놓친다.

```ts title="fingerprint.ts"
export function fingerprint(code: string): string {
  return createHash("sha1").update(code.replace(/\r\n/g, "\n")).digest("hex");
}
```

처음에는 기준선 비교만 따로 줄바꿈을 맞춘 문자열로 비교했다. 그러면 정규화 방식이 두 가지가 된다. `same` 판정은 지문으로 하고 `kept`·`changed`는 다른 방식으로 하게 된다. 두 방식이 어긋나는 날에는 같다고 해 놓고 양쪽이 고쳤다고 하는 모순이 생긴다. 그래서 비교 기준을 지문 함수 하나로 통일했다.

## 무엇이 있는지는 폴더가, 순서는 기록이 정한다

예전에는 현장 폴더의 `manifest.json`이 어떤 룰이 있는지를 정했다. 그러다 보니 폴더에 파일이 있어도 목록에 없으면 그 룰은 아무 경고 없이 돌지 않았다. VSCode로 룰 파일을 새로 만들면 딱 그 상태가 된다.

그래서 현장 폴더는 목록 파일을 읽지 않고 폴더를 스캔하게 바꿨다. 순서는 `.state.json`의 `order`가 정한다. `order`에 있는 것은 그 순서대로, 없는 것은 뒤에 이름순으로 둔다.

```ts title="order.ts"
export function orderNames(found: string[], order: string[]) {
  const at = new Map(order.map((n, i) => [n, i]));
  // Infinity를 쓰면 둘 다 없을 때 Infinity - Infinity = NaN이 된다
  const rank = (n: string) => at.get(n) ?? Number.MAX_SAFE_INTEGER;
  const ranked = [...found].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  // 공통 파일은 언제나 룰보다 먼저 올라간다
  return { support: ranked.filter((n) => !isRule(n)), rules: ranked.filter(isRule) };
}
```

> [!NOTE]
> `Infinity`로 매겨도 지금은 결과가 맞는다. `NaN`이 falsy라서 뒤의 이름순 비교로 넘어가기 때문이다. 하지만 이건 우연히 가려진 문제라 시험으로 잡을 수 없다. 실제로 `Infinity`로 되돌려 보고 시험이 통과하는 것을 확인한 뒤 유한한 큰 수로 바꿨다.

목록 파일이 막아 주던 것도 하나 있었다. 편집하다 남긴 `.bak`이나 사본이 룰로 올라가는 일이다. 그래서 스캔할 때 계약의 파일 이름 규칙과 같은 정규식으로 거르고, `.d.ts` 선언 파일도 뺀다. 스캔은 한 단계 깊이와 `data/` 폴더만 훑으므로 `.base/`는 잡히지 않는다.

반입본은 반대로 목록 파일을 그대로 따른다. 배포 산출물이라 아무도 손대지 않는 자리이고, 새 룰이 어느 순서에 들어가야 하는지 전할 방법이 목록뿐이다. 현장과 반입본을 다르게 다루는 것은 의도한 설계다.

> [!TIP]
> 설계 초안에서는 순서와 꺼 둔 목록을 DB로 옮기려 했다가 되돌렸다. 룰만 따로 되돌리는 일이 실제로 있는데, 그때 DB는 따라오지 않는다. 순서를 잃으면 변환 결과가 말없이 달라지고, 꺼 둔 목록을 잃으면 꺼 둔 룰이 다시 돈다. 그래서 룰에 딸린 기록은 전부 룰 폴더 안에 두었다. 폴더를 통째로 복사하면 기록도 같이 따라온다.

## 정리

- 배포본으로 현장 폴더를 덮지 않고 따로 둔 뒤 파일마다 고르게 했다.
- 기준선과 현장만 비교하면 현장에서 고친 파일이 전부 `양쪽이 고침`이 된다. 기준선·현장·반입본 세 점을 비교해 여덟 갈래로 나눴다.
- 기준선은 "마지막으로 판단을 내린 배달본"이다. 유지를 골라도 갱신하고, 파일을 지울 때도 지우지 않는다. 기준선을 모르면 사람에게 묻는다.
- 해시 지문은 같은지 다른지만 알려 준다. 받을 당시 원문을 `.base/`에 남겨서 누가 어느 줄을 고쳤는지 볼 수 있게 했다.
- 비교는 줄바꿈을 정규화한 지문 하나로만 한다. 비교 기준이 둘이면 판정끼리 어긋날 수 있다.
- 어떤 룰이 있는지는 폴더 스캔이, 순서는 `.state.json`의 `order`가 정한다. 반입본은 목록 파일을 따른다.
