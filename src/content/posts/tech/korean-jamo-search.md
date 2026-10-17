---
title: "'생ㄴ'으로 '생년월일' 찾기: 자모 단위 한글 검색"
description: "목록 검색 칸에서 '생년월일'을 치다 보면 '생ㄴ' 순간에 결과가 사라졌다. 문자열을 자모로 풀어 비교하고, 겹모음·겹받침을 낱자로 나눠 조합 중인 글자로도 찾게 만든 방법을 정리했다."
date: 2026-10-17
category: "Tech/JavaScript"
tags: ["javascript", "typescript", "korean", "unicode", "search"]
series: "레거시 ERP 이관기"
seriesOrder: 7
draft: true
---

회사 ERP의 표시 열 목록에서 "생년월일"을 찾으려고 한 글자씩 치면, "생"까지는 목록에 남아 있다가 "생ㄴ"이 되는 순간 사라졌다. "생녀"에서도 없고, "생년"이 완성돼야 다시 나타났다. 치는 동안 결과가 깜빡이는 것이다. 이 글은 이 문제를 고친 작은 함수 이야기다. 코드는 AI 코딩 에이전트와 함께 작업했다.

## 왜 사라지나

IME로 한글을 치는 동안 입력칸의 값은 완성된 글자가 아니다. "생년"을 치는 과정은 이렇다.

```text title="입력 과정"
ㅅ → 새 → 생 → 생ㄴ → 생녀 → 생년
```

"생ㄴ"의 `ㄴ`은 아직 음절이 되지 않은 낱자다. `"생년월일".includes("생ㄴ")`은 false다. 그래서 그 순간만 목록이 비었다.

더 헷갈리는 경우도 있다. "가나"를 치다 보면 중간에 "간"이 된다. `ㄴ`이 다음 글자의 초성이 될지 앞 글자의 받침이 될지 아직 모르기 때문이다. "가나다"는 "간"을 포함하지 않지만, 사용자는 분명히 "가나"를 치는 중이다.

## 자모로 풀어서 비교한다

해결은 양쪽을 자모로 풀어서 비교하는 것이다. "생년월일"은 `ㅅㅐㅇㄴㅕㄴㅇㅝㄹㅇㅣㄹ`이 되고, "생ㄴ"은 `ㅅㅐㅇㄴ`이 된다. 앞의 것이 뒤의 것을 포함한다. "간"은 `ㄱㅏㄴ`이고, "가나다"는 `ㄱㅏㄴㅏㄷㅏ`이므로 역시 포함된다.

유니코드의 한글 음절(가~힣, 11,172자)은 규칙적으로 배열돼 있어서 계산만으로 풀 수 있다.

```text title="한글 음절 분해 공식"
code = 글자코드 - 0xAC00          (0 ~ 11171)
초성 = floor(code / 588)          588 = 중성 21 × 종성 28
중성 = floor((code % 588) / 28)
종성 = code % 28                  0 이면 받침 없음
```

예를 들어 "생"은 `0xC0DD - 0xAC00 = 5341`이다. 5341 / 588 = 9(ㅅ), 5341 % 588 = 49, 49 / 28 = 1(ㅐ), 49 % 28 = 21(ㅇ)이 된다.

## 겹모음과 겹받침은 낱자로

여기까지만 하면 "과장"을 "고"로 찾지 못한다. "과"를 치는 과정은 `ㄱ → 고 → 과`이고, "과"를 그대로 풀면 `ㄱㅘ`다. `ㄱㅗ`는 `ㄱㅘ`에 들어 있지 않다. 겹받침도 같다. "닭"을 치는 중에는 "달"을 거친다.

그래서 중성·종성 표를 만들 때 겹자모는 처음부터 낱자로 적는다. `ㅘ`는 `ㅗㅏ`, `ㄺ`은 `ㄹㄱ`이다. 사용자가 낱자로 직접 친 `ㄳ` 같은 호환 자모도 같은 규칙으로 나눈다. 반대로 `ㄲ`, `ㅆ`은 나누지 않는다. 키보드에서 Shift와 함께 한 번에 치는 글자라 입력 도중에 `ㄱ`을 거치지 않기 때문이다.

```ts title="jamo-search.ts"
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅗㅏ","ㅗㅐ","ㅗㅣ","ㅛ","ㅜ","ㅜㅓ","ㅜㅔ","ㅜㅣ","ㅠ","ㅡ","ㅡㅣ","ㅣ"];
const JONG = ["","ㄱ","ㄲ","ㄱㅅ","ㄴ","ㄴㅈ","ㄴㅎ","ㄷ","ㄹ","ㄹㄱ","ㄹㅁ","ㄹㅂ","ㄹㅅ","ㄹㅌ","ㄹㅍ","ㄹㅎ","ㅁ","ㅂ","ㅂㅅ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
// 낱자로 친 겹자모
const SPLIT: Record<string, string> = {
  ㄳ: "ㄱㅅ", ㄵ: "ㄴㅈ", ㄶ: "ㄴㅎ", ㄺ: "ㄹㄱ", ㄻ: "ㄹㅁ", ㄼ: "ㄹㅂ", ㄽ: "ㄹㅅ", ㄾ: "ㄹㅌ", ㄿ: "ㄹㅍ", ㅀ: "ㄹㅎ", ㅄ: "ㅂㅅ",
  ㅘ: "ㅗㅏ", ㅙ: "ㅗㅐ", ㅚ: "ㅗㅣ", ㅝ: "ㅜㅓ", ㅞ: "ㅜㅔ", ㅟ: "ㅜㅣ", ㅢ: "ㅡㅣ",
};
const BASE = 0xac00, LAST = 11171;

export function toJamo(text: string): string {
  let out = "";
  for (const ch of text.toLowerCase()) {
    const code = ch.charCodeAt(0) - BASE;
    if (code >= 0 && code <= LAST) {
      out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
    } else {
      out += SPLIT[ch] ?? ch; // 영문·숫자·낱자는 그대로(겹자모만 나눔)
    }
  }
  return out;
}

export function toInitials(text: string): string {
  return [...text].map((ch) => {
    const code = ch.charCodeAt(0) - BASE;
    return code >= 0 && code <= LAST ? CHO[Math.floor(code / 588)] : ch;
  }).join("");
}

const isInitialsOnly = (q: string) => /^[ㄱ-ㅎ\s]+$/.test(q) && [...q.replace(/\s/g, "")].every((c) => CHO.includes(c));

export function matchKo(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (text.toLowerCase().includes(q.toLowerCase())) return true;     // 빠른 길
  if (toJamo(text).includes(toJamo(q))) return true;                 // 조합 중인 글자
  return isInitialsOnly(q)                                            // 초성 검색
    && toInitials(text).replace(/\s/g, "").includes(q.replace(/\s/g, ""));
}
```

초성 검색도 함께 넣었다. 쿼리가 초성만으로 이뤄져 있으면 "ㅅㄴㅇㅇ"으로 "생년월일"을, "ㄱㅂㄱ"으로 "기본 급여"를 찾는다. 공백은 무시한다.

> [!NOTE]
> 자모 비교는 "넓게 찾기"다. "ㄴ"을 치면 받침에 ㄴ이 있는 글자도 걸린다. 목록에서 고르는 용도에는 이 정도가 맞다. 대신 적용된 필터의 "포함" 조건처럼 결과가 정확해야 하는 곳에는 쓰지 않고 일반 문자열 비교를 그대로 뒀다.

## 테스트로 고정하기

증상이 입력 과정에서만 보이는 문제라 손으로 재현하기 번거롭다. 경우를 테스트로 적어 두었다.

```ts title="jamo-search.test.ts"
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchKo, toJamo } from "./jamo-search.ts";

test("조합 중인 글자", () => {
  assert.ok(matchKo("생년월일", "생ㄴ"));
  assert.ok(matchKo("생년월일", "생년ㅇ"));
  assert.ok(matchKo("가나다", "간"));    // ㄴ 이 아직 받침
  assert.ok(matchKo("과장", "고"));      // 겹모음 치는 중
  assert.ok(matchKo("닭갈비", "달"));    // 겹받침 치는 중
  assert.ok(!matchKo("생년월일", "생년ㅂ"));
});

test("초성·영문", () => {
  assert.ok(matchKo("생년월일", "ㅅㄴㅇㅇ"));
  assert.ok(!matchKo("생년월일", "ㅇㅅ"));
  assert.ok(matchKo("Spring Boot", "boot"));
  assert.equal(toJamo("과"), "ㄱㅗㅏ");
});
```

이 함수 하나를 명령 팔레트(Ctrl+K), 표시 열 목록, 코드 고르기, 필터 값 고르기, 탭 목록 등 화면 안의 목록 찾기에 모두 붙였다. 앞 글에서 쓴 그리드의 목록 칸 찾기도 이 함수를 쓴다. 추천 순서를 정할 때는 같은 방식의 "자모로 시작하는가" 함수를 하나 더 두었다.

## 정리

- IME로 치는 도중의 값은 완성된 글자가 아니라서 `includes`가 중간에 실패한다("생ㄴ", "간").
- 양쪽을 자모로 풀어 부분 문자열로 비교하면 조합 중에도 결과가 유지된다.
- 한글 음절은 `0xAC00`부터 초성·중성·종성 순으로 배열돼 있어 나눗셈 세 번으로 풀린다.
- 겹모음·겹받침은 입력 도중 앞 글자를 거치므로 낱자로 나눠 둔다. 한 번에 치는 쌍자음은 나누지 않는다.
- 초성만 친 쿼리는 초성끼리 비교한다.
- 넓게 찾는 비교는 목록 고르기에만 쓰고, 정확해야 하는 필터 조건에는 쓰지 않는다.
