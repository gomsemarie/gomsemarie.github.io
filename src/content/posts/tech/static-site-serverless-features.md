---
title: "정적 사이트에 꼭 필요한 서버 기능만 붙이기"
description: "정적 홈페이지에 CMS 로그인, 문의 폼, 지원서 제출처럼 서버가 꼭 필요한 기능만 Vercel 함수로 붙였다. 나머지는 빌드 시점과 브라우저에서 처리하고, 각 기능에서 막아야 할 지점을 어떻게 막았는지 정리했다."
date: 2026-10-17
category: "Tech/Astro"
tags: ["astro", "vercel", "serverless", "oauth", "docx"]
series: "회사 홈페이지 리뉴얼"
seriesOrder: 2
draft: true
---

[지난 글](/posts/homepage-lab-redesign/)에서 회사 홈페이지를 Astro 정적 사이트로 다시 만든 이야기를 했다. 설계 문서의 원칙은 "런타임 의존성 0"이었다. 서버를 없애려고 정적 사이트로 바꿨으니 서버 코드를 다시 들이고 싶지 않았다.

그래도 서버 없이는 안 되는 기능이 있었다. 비밀값을 써야 하거나, 방문자가 보낸 값을 믿을 수 없어서 서버에서 다시 확인해야 하는 경우다. 그런 기능만 Vercel 함수로 붙이고, 나머지는 빌드 시점이나 브라우저에서 처리했다. 이번에도 코드는 대부분 AI 코딩 에이전트가 썼고, 나는 어디까지 서버에 둘지 정하고 결과를 확인했다.

| 기능 | 처리 위치 | 서버가 필요한 이유 |
|---|---|---|
| CMS 로그인 | Vercel 함수 2개 | OAuth client secret |
| 문의 폼 | Vercel 함수 | 메일 계정 비밀번호, 봇 확인 재검증 |
| 지원서 Word 파일 | 브라우저 | 필요 없음 |
| 채용 공고 카드 | 빌드 시점 | 필요 없음 |
| 지원서 온라인 제출 | Vercel 함수 | ERP 연동 키, 봇 확인 재검증 |

함수는 저장소의 `api/` 폴더에 둔다. 함수들이 같이 쓰는 코드는 `api/_lib/`에 뒀다. 밑줄로 시작하는 폴더는 Vercel이 주소로 만들지 않아서, 공통 코드가 엔드포인트로 노출되지 않는다.

## Git 기반 CMS의 GitHub 로그인

기존 사이트에는 관리자 서버가 따로 있었다. 새 사이트에서는 Git 기반 CMS인 Sveltia CMS를 `/admin`에 붙였다. 콘텐츠가 저장소의 YAML과 Markdown 파일이라 CMS는 그 파일을 고치는 편집 화면일 뿐이다. 저장하면 바로 운영에 올라가지 않고 PR이 만들어진다. Vercel 미리보기로 확인하고, "게시"를 누르면 main에 병합된다.

CMS는 브라우저에서 GitHub API를 직접 부른다. 문제는 로그인이다. GitHub OAuth에서 code를 토큰으로 바꾸려면 client secret이 필요한데, 이것은 브라우저에 둘 수 없다. 그래서 함수 두 개를 만들었다. 로그인 시작(`/api/auth`)과 콜백(`/api/callback`)이다.

### state 쿠키로 요청 위조 막기

시작 함수는 임의의 state를 만들어 GitHub 인증 주소에 붙이고, 같은 값을 쿠키에도 넣는다. 콜백은 GitHub가 돌려준 state와 쿠키 값이 같은지 본다. 다르면 다른 곳에서 시작된 로그인으로 보고 거절한다.

```js title="api/login-start.js (원리만 다시 쓴 예시)"
export function GET(request) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const go = new URL('https://github.com/login/oauth/authorize');
  go.searchParams.set('client_id', process.env.OAUTH_CLIENT_ID);
  go.searchParams.set('redirect_uri', `${origin}/api/login-callback`);
  go.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: go.toString(),
      // 콜백에서 같은 브라우저인지 확인한다. 10분만 유효, 스크립트에서 못 읽게.
      'Set-Cookie': `oauth_state=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
```

쿠키 경로는 `/api`로 좁혔다. 사이트의 다른 페이지 요청에는 실리지 않는다. 콜백은 처리가 끝나면 이 쿠키를 `Max-Age=0`으로 지운다.

### postMessage로 결과 넘기기

CMS는 로그인을 팝업 창으로 연다. 콜백이 토큰을 받으면 그 결과를 원래 CMS 창에 넘겨야 한다. Decap·Sveltia 계열 CMS가 쓰는 postMessage 규약이 있다. 팝업이 먼저 `authorizing:github`를 보내고, CMS 창이 같은 문자열로 답하면 그때 `authorization:github:success:{...}` 형태로 토큰을 보낸다.

여기서 지킨 것은 하나다. **토큰은 이 사이트와 같은 출처의 창에만 보낸다.** 대상 출처를 `*`로 두면, 다른 사이트가 로그인 창을 열었을 때 그 사이트로 토큰이 넘어갈 수 있다.

```js title="api/login-callback.js 응답 HTML (예시)"
const html = `<script>
  const origin = ${JSON.stringify(origin)};
  const message = ${JSON.stringify(message).replace(/</g, '\\u003c')};
  window.addEventListener('message', (e) => {
    // 같은 출처에서 온 응답일 때만 토큰을 보낸다
    if (e.origin === origin && e.data === 'authorizing:github')
      window.opener?.postMessage(message, origin);
  });
  window.opener?.postMessage('authorizing:github', origin);
</script>`;
```

메시지를 스크립트 안에 넣을 때 `<`를 `<`로 바꿨다. 에러 메시지에 `</script>` 같은 문자열이 섞여도 스크립트 태그가 중간에 닫히지 않게 하려는 것이다. 응답에는 `Cache-Control: no-store`를 붙였다.

## 문의 폼과 봇 확인 재검증

사업 문의 폼은 입력값을 메일로 보낸다. 메일 계정 비밀번호가 필요하니 서버에서 해야 한다. 폼이 공개되면 스팸이 온다는 것도 전제로 했다. 막는 장치를 여러 겹 뒀다.

1. `Origin` 헤더가 이 사이트가 아니면 거절한다.
2. 같은 IP에서 10분에 5번까지만 받는다. 함수 인스턴스 메모리 안에서만 세는 간단한 제한이다.
3. 사람 눈에 안 보이는 칸이 채워졌거나, 폼을 연 지 3초 안에 보냈으면 봇으로 본다. 봇에게는 성공한 것처럼 응답한다.
4. Cloudflare Turnstile 토큰을 서버에서 다시 확인한다.

4번이 중요하다. 브라우저에서 Turnstile 위젯을 통과해야 버튼이 눌리게 해도, 함수 주소로 직접 요청을 보내면 위젯을 건너뛸 수 있다. 그래서 서버가 토큰을 받아 `siteverify`에 다시 물어본다.

```js title="api/_lib/bot-check.js (예시)"
export async function verifyBotToken(token, { secret, ip, fetchFn = fetch }) {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: String(token) });
    if (ip) body.set('remoteip', ip);
    const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return true;          // 확인 서버 장애: 문의는 막지 않는다
    return (await res.json()).success === true;
  } catch {
    return true;                        // 연결 실패도 같은 판단
  }
}
```

> [!WARNING]
> 확인 서버에 닿지 못할 때 통과시키는 것은 일부러 고른 동작이다. 문의 폼에서는 스팸 몇 건보다 진짜 문의를 놓치는 쪽이 더 손해라고 봤다. 다른 장치(Origin, 횟수 제한, 숨은 칸)는 그대로 동작한다. 로그인처럼 막는 쪽이 중요한 곳이라면 반대로 해야 한다.

`fetchFn`을 인자로 받게 한 것은 테스트 때문이다. 가짜 fetch를 넣어 "토큰 없음, 실패, 성공, 500 응답, 연결 실패" 다섯 경우를 확인했다. Turnstile은 키를 넣었을 때만 켜지게 했다. 메일 설정이 없으면 함수가 503과 "준비 중"을 돌려주고, 화면은 폼을 잠그고 이메일 문의를 안내한다.

## 원본 Word 양식을 브라우저에서 채우기

채용 지원자는 회사의 입사지원서 Word 양식을 받아 채워서 보냈다. 이 양식을 웹에서 입력하고 Word 파일로 받을 수 있게 했다. 서버는 쓰지 않는다. 지원자의 개인정보가 서버를 거치지 않아도 되고, 작성 중인 내용은 그 브라우저에만 임시 저장된다.

방법은 이렇다. 원본 `.docx`를 받아 압축을 풀고(fflate), `word/document.xml`의 표 셀 위치에 값을 넣은 뒤 다시 압축한다. 새 문서를 만드는 게 아니라 원본을 채우는 것이라 글꼴, 칸 너비, 테두리가 양식 그대로 남는다.

셀은 좌표로 찾는다. "표1의 0행 1열은 성명"처럼 양식 구조를 주석에 적어 두고, 양식 파일이 바뀌면 좌표도 같이 고친다. 몇 가지 처리를 더 했다.

- 값을 넣을 때 셀 문단의 기본 글꼴은 이어받고, 안내 문구의 파란 글자색은 검정으로 바꾼다.
- 자격증이 칸보다 많으면 행을 복제해 늘린다. 기술경력 표는 빈 행을 하나 떼어 두고 프로젝트 수만큼 복제한다.
- 기술경력 기간 합계를 계산해 제목 옆에 붉은 글씨로 붙인다. 프로젝트 기간이 겹치는 달은 한 번만 센다.

### DOM 구현을 주입받아 테스트하기

XML을 다루려면 `DOMParser`와 `XMLSerializer`가 필요하다. 브라우저에는 있지만 Node에는 없다. 그래서 채우는 함수가 DOM 구현을 인자로 받게 했다.

```ts title="fill-form.ts (예시)"
type Dom = { parser: DOMParser; serializer: XMLSerializer };

export function fillForm(xml: string, data: FormData, dom: Dom): string {
  const doc = dom.parser.parseFromString(xml, 'application/xml');
  // ... 표 셀 좌표에 값을 넣는다
  return dom.serializer.serializeToString(doc);
}

// 브라우저: fillForm(xml, data, { parser: new DOMParser(), serializer: new XMLSerializer() })
// 테스트:   import { DOMParser, XMLSerializer } from '@xmldom/xmldom' 로 같은 함수를 부른다
```

테스트는 실제 양식 파일을 채운 뒤 결과 XML을 다시 읽어 셀 내용을 확인한다. "회사가 작성하는 칸은 양식 그대로인지", "입력하지 않은 학력 행은 건드리지 않았는지", "프로젝트 43개면 행이 정확히 43개인지" 같은 것들이다. 양식이 바뀌어 좌표가 어긋나면 `npm test`에서 바로 드러난다. 테스트 파일은 `.ts` 그대로 Node로 실행한다.

## 채용 공고 카드는 빌드할 때 만든다

채용 공고는 외부 채용 사이트에 올린다. 홈페이지에서는 공고 주소만 데이터 파일에 넣으면 제목, 조건, 마감일이 들어간 카드가 나오게 했다.

공고 내용을 서버에서 가져올 필요는 없었다. 빌드할 때 공고 페이지를 받아 `og:title`과 `og:description`만 읽는다. 링크를 공유할 때 미리보기로 보이는 공개 정보다. 설명 문자열을 "항목 : 값" 단위로 쪼개 조건 목록과 마감일로 나눈다. 파서는 순수 함수로 분리해 테스트했다.

```ts title="postings.ts (예시)"
async function load(p: { url: string; title?: string }): Promise<Posting> {
  try {
    const res = await fetch(p.url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return { ...parseOgMeta(html), url: p.url, ok: true };
  } catch (e) {
    // 조회에 실패해도 빌드는 멈추지 않는다. "공고 보기" 링크 카드로 내보낸다.
    console.warn(`[jobs] ${p.url}: ${(e as Error).message}`);
    return { url: p.url, title: p.title ?? '채용공고', terms: [], ok: false };
  }
}

// 여러 페이지가 import 해도 빌드 1회에 한 번만 조회한다
export const postings = await Promise.all(sitePostings.map(load));
```

외부 사이트가 잠깐 응답하지 않는다고 회사 홈페이지 배포가 막히면 안 된다. 그래서 실패하면 경고만 남기고 링크 카드로 바꾼다. 제목과 마감일은 데이터 파일에서 직접 덮어쓸 수도 있다.

빌드 시점 데이터는 시간이 지나면 낡는다. 그래서 GitHub Actions로 매일 새벽 3시(KST)에 Vercel 배포 훅을 호출해 다시 빌드한다. 공고 정보와 함께 업력 연도도 이때 갱신된다. 마감일이 지난 공고는 다음 빌드를 기다리지 않고 방문자 브라우저에서 바로 숨긴다.

## 내용 해시로 중복 접수 막기

나중에 지원서를 회사 ERP로 바로 보내는 기능이 붙었다. 이 함수에서 신경 쓴 것은 중복 접수다. 제출 버튼을 두 번 누르거나, 응답이 늦어 다시 보내거나, 일부러 같은 요청을 반복해도 ERP에는 한 건만 들어가야 한다.

방법은 지원서 번호를 서버가 **내용으로** 만드는 것이다. 입력값을 정리(앞뒤 공백 제거, 빈 항목 제거)한 뒤 SHA-256 해시를 내고, 그 앞부분을 번호로 쓴다. ERP는 같은 번호가 이미 있으면 새로 넣지 않고 "이미 접수됨"으로 답한다.

```js title="api/_lib/application-id.js (예시)"
import { createHash } from 'node:crypto';

export function applicationId(body) {
  // body: 정리된 지원서 내용. 동의 시각이나 첨부 파일은 넣지 않는다.
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('base64url');
  return `web-${hash.slice(0, 32)}`;
}
```

해시에 넣는 범위가 중요했다. 동의 시각을 넣으면 보낼 때마다 번호가 달라져 중복을 못 잡는다. 그래서 동의 정보와 첨부 파일은 해시를 만든 뒤에 붙였다. 테스트로 "이름 앞뒤에 공백이 있거나 빈 자격증 칸이 있어도 같은 번호", "전화번호가 다르면 다른 번호"를 확인했다.

> [!NOTE]
> 같은 내용이 다시 오는 것과 같은 사람이 다시 지원하는 것은 다른 문제다. 앞의 것은 홈페이지가 번호로 막고, 뒤의 것(재지원 기간)은 ERP가 판단한다. 브라우저도 마지막 제출 정보를 기억해 둬서, 같은 사람이 기간 안에 다시 누르면 요청을 보내지 않고 안내만 띄운다.

ERP 주소나 키가 설정되지 않으면 함수는 꺼진 상태를 알려 주고, 화면은 "온라인으로 제출" 버튼을 숨긴 채 예전처럼 Word 파일 만들기만 보여 준다. 기능 하나가 준비되지 않았다고 페이지 전체가 깨지지 않게 하는 방식은 문의 폼과 같다.

## 정리

- 서버는 비밀값이 필요하거나 입력을 다시 확인해야 하는 기능에만 붙였다. CMS 로그인, 문의 폼, 지원서 온라인 제출이다.
- CMS OAuth는 함수 두 개로 처리했다. state 쿠키로 같은 브라우저인지 확인하고, 토큰은 같은 출처 창에만 postMessage로 넘긴다.
- 봇 확인은 브라우저 위젯만으로는 부족하다. 서버에서 `siteverify`로 다시 확인한다. 확인 서버 장애 때 통과시킬지는 기능마다 따로 정한다.
- Word 지원서는 원본 양식의 표 셀을 채우는 방식으로 브라우저에서 만든다. DOM 구현을 주입받게 해서 Node에서 xmldom으로 같은 코드를 테스트했다.
- 채용 공고 카드는 빌드 때 og 메타로 만들고, 실패해도 빌드는 계속한다. 매일 재빌드로 낡은 정보를 갱신한다.
- 지원서 번호를 내용 해시로 만들어, 같은 요청이 여러 번 와도 한 번만 접수되게 했다.
- 설정이 빠진 기능은 꺼진 상태로 동작하게 해서, 준비가 덜 된 기능 때문에 사이트가 깨지지 않게 했다.
