---
title: "Java Tabula의 표 추출을 pdfjs-dist로 옮기기: float 계산까지 같게"
description: "기존 Java API가 Tabula로 읽던 급여 관련 PDF 표를 TypeScript와 pdfjs-dist로 다시 구현했다. 선 맞추기, 교차점, 칸 찾기를 그대로 옮기고 Java float 계산을 Math.fround로 재현한 뒤, 일부러 망가뜨린 시험 PDF로 기존 결과와 대조했다."
date: 2026-10-17
category: "Tech/TypeScript"
tags: ["pdf", "pdfjs", "tabula", "typescript", "migration"]
series: "레거시 ERP 이관기"
seriesOrder: 5
---

회사 ERP에는 PDF를 올리면 표를 읽어 사람별 값 목록을 돌려주는 API가 있다. 외부에서 받는 급여 관련 PDF를 화면에 옮겨 적는 수고를 줄이는 기능이다. 기존 Java API는 이 일을 Tabula와 PDFBox로 했다. 새 API는 Node에서 돈다. 표 추출도 TypeScript로 옮겨야 했다.

조건은 이 시리즈의 다른 API와 같았다. 같은 PDF를 넣으면 기존과 같은 값이 나와야 한다. 이 글은 Tabula의 표 찾기를 pdfjs-dist 위에 다시 짠 과정과, 결과가 같은지 확인한 방법을 정리한 것이다. 이식 코드와 시험 파일 생성기는 AI 코딩 에이전트와 함께 만들었다.

## 왜 pdfjs-dist인가

새 ERP에는 "폐쇄망에도 그대로 설치할 수 있어야 한다"는 조건이 있다. 라이선스도 MIT, Apache-2.0, BSD 계열만 쓰기로 정해 두었다. 이 조건으로 보면 고를 수 있는 것이 많지 않았다.

- Java Tabula를 그대로 쓰려면 Node 서버 옆에 JVM을 따로 띄워야 한다. 설치 묶음과 운영 대상이 하나 늘어난다.
- pdfjs-dist는 Apache-2.0이고 순수 JavaScript다. Node 패키지로 같이 반입하면 된다.

pdfjs-dist는 표를 찾아 주지 않는다. 페이지의 그리기 명령(선, 사각형, 글자)을 꺼내 주는 것까지다. 표 찾기는 직접 해야 했다. 그래서 Tabula의 알고리즘을 그대로 옮기기로 했다. 새로 설계하면 결과가 기존과 같다고 말할 근거가 없다.

폐쇄망 때문에 신경 쓴 것이 하나 더 있다. pdfjs는 한글 CID 글꼴을 읽을 때 CMap 파일을, 내장되지 않은 표준 글꼴을 읽을 때 글꼴 데이터를 찾는다. 위치를 지정하지 않으면 이 파일을 읽지 못한다. 패키지 안의 `cmaps`와 `standard_fonts` 폴더를 로컬 경로로 지정하고, 배포 묶음에 이 폴더가 들어가게 빌드 설정을 고쳤다. 워커도 쓰지 않고 같은 스레드에서 해석한다.

## Tabula가 표를 찾는 순서

기존은 Tabula의 선 기반 방식(lattice)을 썼다. 칸을 나누는 선이 그려진 표에서, 선만 보고 칸을 찾는 방식이다. 순서는 이렇다.

1. **수집.** 페이지에서 선(ruling)과 글자를 모은다. 좌표는 PDFBox처럼 왼쪽 위가 원점이다. 사각형은 네 변의 선으로 쪼갠다. 1도 안쪽으로 기운 선은 수평·수직으로 편다.
2. **선 맞추기(snap).** 끝점이 조금씩 어긋난 선을 맞춘다. 끝점을 x, y 순으로 정렬하고, 글자의 최소 폭·높이 안에 모인 점들을 평균 위치로 옮긴다.
3. **합치기(collapse).** 같은 줄에서 겹치거나 1pt 안으로 붙은 선을 하나로 합친다.
4. **교차점.** 수평선과 수직선이 만나는 점을 모두 구한다. 선을 2pt씩 늘려서 살짝 못 미친 선도 만나게 한다.
5. **칸.** 교차점마다 그 점을 왼쪽 위로 하는 가장 작은 사각형을 찾는다. 오른쪽 위, 왼쪽 아래, 오른쪽 아래 점이 같은 선으로 이어져 있어야 한다.
6. **표 영역과 행·열.** 칸들의 바깥 다각형으로 표 영역을 정하고, 칸을 위쪽 좌표로 묶어 행을, 행 안의 순서로 열을 정한다.
7. **칸 글자.** 칸 안의 글자를 간격을 보고 단어로 합친다. 간격이 넓으면 공백을 넣고, 아래 줄로 내려가면 줄바꿈을 넣는다.

Java 코드를 함수 단위로 대응시키며 옮겼다. 함수마다 원래 Java 메서드 이름을 주석으로 달았다. 나중에 결과가 다르면 어느 단계가 다른지 Java 쪽과 바로 맞춰 볼 수 있게 하려는 것이다.

옮기다 보니 기존 코드의 특이한 동작도 만났다. 선 맞추기에서 정렬한 점 목록을 처음부터 끝까지가 아니라 `subList(1, size - 1)`로 훑는다. 그래서 정렬 순서상 마지막 점은 맞추기에서 빠진다. 버그에 가깝지만 결과에 영향을 주므로 그대로 옮겼다.

```ts title="snap-points.ts (원리만 다시 쓴 예시)"
const F = Math.fround;

type Pt = { x: number; y: number };

// 끝점을 축마다 정렬해 tolerance 안에 모인 점을 평균 위치로 옮긴다
export function snapAxis(points: Pt[], axis: "x" | "y", tolerance: number) {
  if (!points.length) return;
  const sorted = [...points].sort((a, b) => a[axis] - b[axis]);
  const groups: Pt[][] = [[sorted[0]]];
  for (const p of sorted.slice(1, -1)) { // 기존 Java 와 같게 마지막 점은 훑지 않는다
    const g = groups[groups.length - 1];
    if (Math.abs(p[axis] - g[0][axis]) < tolerance) g.push(p);
    else groups.push([p]);
  }
  for (const g of groups) {
    let sum = 0;
    for (const p of g) sum = F(sum + p[axis]); // float 누적
    const avg = F(sum / g.length);
    for (const p of g) p[axis] = avg;
  }
}
```

## Java float을 Math.fround로

옮기면서 가장 조심한 것은 정밀도였다. Tabula의 사각형과 선은 `Rectangle2D.Float`, `Line2D.Float`라 좌표를 32비트 `float`로 들고 있다. JavaScript 숫자는 64비트다. 같은 계산이라도 중간값의 반올림이 다르다. 교차점을 "좌표가 같은 점"으로 찾는 단계에서는 이 차이가 칸 하나를 바꾼다.

그래서 Java에서 `float`인 값은 저장할 때마다 `Math.fround`를 씌웠다. 덧셈 한 번, 곱셈 한 번마다다. 좌표 변환 행렬 곱도 PDFBox처럼 항마다 `float`로 자른다.

```ts title="java-float.ts"
const F = Math.fround; // Java float 로 자르기

// PDFBox Matrix.multiply 처럼 항마다 float
export const mul = (m: number[], n: number[]) => [
  F(F(m[0] * n[0]) + F(m[1] * n[2])), F(F(m[0] * n[1]) + F(m[1] * n[3])),
  F(F(m[2] * n[0]) + F(m[3] * n[2])), F(F(m[2] * n[1]) + F(m[3] * n[3])),
  F(F(F(m[4] * n[0]) + F(m[5] * n[2])) + n[4]), F(F(F(m[4] * n[1]) + F(m[5] * n[3])) + n[5]),
];

// Tabula 의 round(d, 2): Double.toString → BigDecimal HALF_UP → float
export function round2(d: number) {
  const s = String(d);
  if (/e/i.test(s)) return F(Number(d.toFixed(2)));
  const neg = s.startsWith("-");
  const [int, frac = ""] = s.replace("-", "").split(".");
  let v = Number(int + (frac + "00").slice(0, 2));
  if ((frac[2] ?? "0") >= "5") v += 1;
  return F(((neg ? -1 : 1) * v) / 100);
}
```

`round2`는 숫자가 아니라 **문자 표현**을 기준으로 반올림한다. Java가 `Double.toString`으로 문자열을 만든 뒤 `BigDecimal`로 반올림하기 때문이다. `Math.round(d * 100) / 100`으로 쓰면 `1.005`가 `1.00`이 된다. 이진수로는 `1.005`가 `1.00499...`이기 때문이다. 문자열 기준이면 `1.01`이 나온다. 테스트에 이 경계값들을 넣어 두었다.

> [!NOTE]
> JavaScript의 `String(number)`와 Java의 `Double.toString`이 모든 값에서 같은 문자열을 내지는 않는다. 둘 다 "원래 값을 되살릴 수 있는 가장 짧은 표현"을 목표로 하지만 지수 표기 기준이 다르다. 표 좌표 범위에서는 지수 표기가 나오지 않아서, 지수 표기일 때만 따로 처리했다.

pdfjs와 PDFBox가 주는 정보가 달라서 맞춘 곳도 있다. 글자 높이는 PDFBox처럼 글꼴 상자 높이의 절반을 쓴다. pdfjs는 CapHeight를 넘겨주지 않아서, 글꼴 상자 절반보다 작은 CapHeight를 가진 글꼴에서는 차이가 날 수 있다. 내장되지 않은 표준 글꼴은 pdfjs가 글꼴 상자를 주지 않아서, 표준 글꼴의 AFM 상자 값을 표로 넣었다. 같은 자리에 같은 글자가 겹쳐 찍힌 경우를 하나로 치는 규칙도 PDFBox의 텍스트 추출과 같게 옮겼다.

## 시험 PDF를 직접 만들었다

대조에 실제 문서를 쓸 수는 없었다. 개인 급여 정보가 들어 있다. 그래서 시험 PDF를 만드는 스크립트를 따로 짰다. 라이브러리 없이 PDF 문법을 직접 써서 만든다. 라이브러리를 쓰면 그 라이브러리가 그리는 방식 하나로만 시험하게 된다. 직접 쓰면 선을 어떻게 그릴지, 글자를 어떤 명령으로 찍을지 고를 수 있다.

데이터는 가짜 이름과 계산된 금액이다. 실제 문서의 배치(머리 행 몇 줄, 사람마다 여러 행, 끝에 합계)만 흉내 냈다. 그 위에 그리는 방식을 바꿔 가며 13개 파일을 만들었다.

| 시험 | 노리는 것 |
|---|---|
| 전체 선 / 칸마다 사각형 / 얇은 채운 사각형 | 선을 그리는 세 가지 방식 |
| 끝점이 어긋난 짧은 선 조각 | 선 맞추기와 합치기 |
| 회색 바탕 머리 + 축소 변환 + 자르기 | 좌표 변환 행렬과 클리핑 |
| 넓은 자간, 전각·호환 문자 | 단어 합치기와 NFKC 정규화 |
| 글자를 하나씩 찍는 TJ 명령 | 글자 간격 계산 |
| 두 쪽에 걸친 표, 합계 없음, 머리만 있는 표 | 표 경계 처리 |
| 빈 금액을 `-`로, 빈 사번 | 오류 경로 |
| 쪽 회전 90도 | 회전 처리 |

> [!TIP]
> 시험 PDF는 저장소에 바이너리로 표시해야 한다. 텍스트로 취급되면 체크아웃할 때 줄바꿈이 바뀔 수 있고, 그러면 PDF 안의 바이트 위치표가 어긋나 파일이 깨진다. 시험 파일을 넣자마자 `.gitattributes`에 `*.pdf binary`를 추가했다.

## 기존 결과와 대조

대조 스크립트는 같은 PDF를 multipart로 기존 API와 새 API에 보내고 응답을 비교한다. 여러 파일을 한 번에 올리는 경우는 새 쪽에만 있는 기능이라, 기존 쪽은 파일별 응답을 이어 붙여서 비교했다.

`--save`로 돌리면 기존 API 응답을 PDF 옆에 `*.legacy.json`으로 저장한다. 이 파일이 단위 테스트의 정답지가 된다. 덕분에 Java API를 띄우지 않고도 `node --test`로 같은 확인을 할 수 있다.

```ts title="table-extract.test.ts (원리만 다시 쓴 예시)"
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".legacy.json"))) {
  test(`기존과 같은 값: ${f}`, async () => {
    const want = JSON.parse(readFileSync(join(DIR, f), "utf8"));
    const pdf = new Uint8Array(readFileSync(join(DIR, f.replace(".legacy.json", ".pdf"))));
    const run = async () => toRows(await extractTables(pdf), layout);
    if (!Array.isArray(want)) return void (await assert.rejects(run)); // 기존이 오류였던 파일
    assert.deepEqual(stripDbFields(await run()), stripDbFields(want));
  });
}
```

시험 PDF 13개와 예외 사례 3개(여러 파일, PDF가 아닌 파일, 빈 파일)를 돌려 14건이 일치했다. 2건은 의도한 차이다.

- **쪽 회전.** 기존은 회전된 쪽에서 표를 잘못 읽다 500 오류로 끝났다. 새 쪽은 회전 전 좌표로 읽는다.
- **빈 사번.** 사번이 비어 있으면 사람을 찾는 조회가 여러 건을 돌려준다. 기존은 Spring 기본 500 응답, 새 쪽은 다른 API와 같은 DB 오류 코드로 응답한다. 둘 다 실패지만 응답 본문 형식이 다르다.

비교 스크립트는 기존 쪽이 500일 때만 이 두 파일을 "의도한 차이"로 센다. 기존 결과가 바뀌면 다시 불일치로 드러난다.

## 남은 제약

지원 범위는 회전 없는 쪽과 가로쓰기 글자로 정했다. 실제로 받는 문서가 그런 모양이다. 세로쓰기나 회전된 쪽은 기존과 결과가 다를 수 있다고 코드 머리 주석에 적어 두었다. CapHeight 차이도 남아 있다. 문서를 만드는 쪽이 글꼴이나 배치를 바꾸면, 그 문서로 시험 PDF를 하나 더 만들어 다시 대조해야 한다.

## 정리

- 폐쇄망 설치와 라이선스 조건 때문에 JVM을 두지 않고 pdfjs-dist(Apache-2.0)를 골랐다. CMap과 표준 글꼴 파일은 로컬 경로로 넣었다.
- 표 찾기는 새로 설계하지 않고 Tabula의 선 맞추기, 합치기, 교차점, 칸 찾기를 함수 단위로 옮겼다. 기존 코드의 특이한 동작도 결과에 영향을 주면 그대로 옮겼다.
- Java `float` 값은 연산마다 `Math.fround`로 잘랐고, 반올림은 Java처럼 문자 표현 기준으로 했다.
- 시험 PDF를 직접 만들어 선 그리기 방식, 어긋난 선, 변환, 자간, 회전을 하나씩 노렸다.
- 기존 응답을 정답지로 저장해 단위 테스트로 돌렸다. 14건 일치, 2건은 이유를 적은 의도한 차이다.
