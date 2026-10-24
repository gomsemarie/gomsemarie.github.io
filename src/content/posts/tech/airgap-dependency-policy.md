---
title: "폐쇄망 설치를 염두에 둔 ERP 의존성 규칙"
description: "클라우드에서 운영하는 ERP를 인터넷 없는 폐쇄망에도 그대로 설치할 수 있게 하려고, 라이선스는 허용 목록으로, 실행 중 외부 접속과 플랫폼 전용 기능은 금지로, 외부 연동은 키가 없으면 꺼지는 선택 기능으로 정했다."
date: 2026-10-07
category: "Tech/Architecture"
tags: ["architecture", "airgap", "self-hosted", "license", "nextjs"]
series: "레거시 ERP 이관기"
seriesOrder: 9
---

회사 ERP의 새 버전은 클라우드에서 운영한다. 화면과 API는 Vercel, DB·인증·파일은 Supabase를 쓴다. 다만 처음부터 붙은 조건이 있었다. **인터넷이 없는 폐쇄망에도 그대로 설치할 수 있어야 한다.** 다른 회사에 설치해 줄 수도 있고 사내 서버로 옮길 수도 있는데, 그때 "이 기능은 클라우드에서만 됩니다"라는 말이 나오면 곤란하다.

이 조건은 라이브러리를 하나 추가하거나 기능을 하나 붙일 때마다 깨질 수 있다. 그래서 규칙을 문서로 먼저 정하고 코드를 쓸 때마다 거기에 맞췄다. 코드는 AI 코딩 에이전트에게 맡긴 부분이 많아서, 에이전트에게 주는 작업도 같은 문서를 기준으로 삼게 했다.

## 규칙 1: 라이선스는 허용 목록으로

새 라이브러리는 **MIT, Apache-2.0, BSD, ISC, OFL**만 쓴다. GPL, AGPL, 상용, "비상업적 무료" 라이선스는 쓰지 않고, 애매하면 추가하기 전에 묻는다.

금지 목록 대신 허용 목록을 둔 것은 매번 판단할 일을 줄이려고였다. 라이선스 종류가 많아서 조건을 하나하나 읽어 볼 수는 없다. 목록에 없으면 멈추고 묻기만 하면 된다.

의존성을 추가할 때마다 검사도 다시 한다. 따로 도구를 깔지 않고, `package-lock.json`에서 운영 의존성만 골라 각 패키지의 `license` 필드를 세는 짧은 node 스크립트를 썼다.

```js title="license-count.mjs (원리만 다시 쓴 예시)"
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const count = {};
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev) continue;                        // 루트·개발 의존성 제외
  const lic = JSON.parse(readFileSync(`${path}/package.json`, "utf8")).license ?? "UNKNOWN";
  (count[lic] ??= []).push(path.replace(/^.*node_modules\//, ""));
}
for (const [lic, names] of Object.entries(count)) console.log(lic, names.length, lic.match(/MIT|Apache|BSD|ISC|OFL/) ? "" : names);
```

첫 검사에서는 LGPL이 걸렸다. 모두 Next.js가 이미지 최적화용으로 선택 설치하는 `sharp`의 플랫폼별 바이너리였다. 이 앱은 `next/image`를 쓰지 않아서 설치 묶음을 만들 때 그 폴더를 지운다. 남겨 두더라도 동적 링크로 수정 없이 쓰는 것이라 고지만 하면 상업적으로 쓸 수 있다는 내용도 문서에 적었다.

앱 바깥 구성 요소도 같은 기준으로 봤다. 컨테이너는 상용 라이선스가 걸린 Docker Desktop 대신 Docker Engine을 쓴다. DB 이미지에는 쓰지 않는 확장이 GPL로 들어 있는데, 설치하지 않으니 ERP와는 상관이 없다. 다만 이미지를 그대로 다른 회사에 넘기면 GPL 구성 요소를 고지해야 한다고 적어 두었다.

## 규칙 2: 실행 중에는 인터넷에 접속하지 않는다

CDN 스크립트, Google Fonts, 외부 아이콘·이미지 링크를 쓰지 않는다. 폰트와 아이콘은 패키지나 파일로 넣는다.

여기서 폰트가 걸렸다. 처음에는 `next/font/google`로 Geist를 쓰고 있었는데, 이 방식은 **빌드할 때** Google Fonts에서 파일을 받아 결과물에 넣는다. 실행 중에는 외부 접속이 없으니 규칙에 어긋나지 않는 것처럼 보이지만, 폐쇄망 안에서 빌드하면 그 단계에서 실패한다. 밖에서 빌드해 들고 들어가는 방법밖에 남지 않는다.

그래서 `next/font/local`로 바꾸고 Pretendard Variable(OFL-1.1) woff2 파일을 npm 패키지에서 가져와 직접 넣었다. 한글 폰트라 약 2MB지만 외부 접속 없이 빌드와 실행이 모두 된다.

```tsx title="layout.tsx (원리만 다시 쓴 예시)"
import localFont from "next/font/local";

// 패키지 안의 파일을 직접 넣는다 — 빌드·실행 모두 외부 접속 없음
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans",
  weight: "45 920",
  display: "swap",
});
```

규칙을 지켰는지는 빌드 결과물에서 `http(s)://` 주소를 모두 뽑아 확인했다. 오류 메시지 안의 문서 링크를 빼면 실제로 접속하는 곳은 몇 개 남지 않았고, 각각 폐쇄망에서 어떻게 되는지 표로 적었다. 마지막 점검은 서버의 바깥 방향 방화벽을 막은 상태에서 주요 기능이 통과하는지 보는 것으로 정했다.

## 규칙 3: 플랫폼 전용 기능은 쓰지 않는다

Vercel의 Blob, KV, Edge Config, Analytics, Cron은 쓰지 않는다. Supabase에서도 클라우드 전용 기능(브랜칭, 관리 API, 로그 드레인, AI 기능)은 쓰지 않는다. 편하긴 하지만 한번 쓰면 그 플랫폼을 떠나기 어려워진다.

대신 이렇게 하기로 했다.

- **예약 작업**: 앱에 `/api/cron/*` 주소를 만들고 Bearer 비밀값으로 보호한다. 클라우드에서는 플랫폼의 cron이 이 주소를 부르고, 폐쇄망에서는 서버의 cron이 `curl`로 같은 주소를 부른다. 작업 로직은 앱 안에 하나만 있다.
- **DB 변경**: 마이그레이션 SQL 파일로만 한다. 대시보드에서 손으로 바꾸지 않는다.
- **비밀값·암호화 키**: 환경변수(또는 파일)로 받는다. 클라우드 KMS에 묶지 않는다.

```ts title="cron-route.ts (원리만 다시 쓴 예시)"
// 누가 부르든 같은 주소 — 클라우드 cron 이든 서버 crontab 이든
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const result = await cleanupUnconfirmedFiles({ dryRun: new URL(req.url).searchParams.has("dryRun") });
  return Response.json(result);
}
```

## Self-Hosted 구성 원칙

폐쇄망에서는 Supabase를 자체 설치(Self-Hosted)로 띄운다. 이때 지킬 원칙은 다음과 같다.

- **필요한 것만 띄운다.** 앱은 DB에 `pg`로 직접 붙고, 인증은 GoTrue, 파일은 Storage API만 부른다. 자동 생성 REST API(PostgREST), Realtime, Edge Functions는 쓰지 않는다. 쓰지 않는 서비스는 띄우지 않거나, 의존성 때문에 떠도 바깥에 열지 않는다.
- **앞에 리버스 프록시 하나.** TLS는 프록시가 맡는다. 브라우저에는 파일 서명 주소로 받기(GET)·올리기(PUT)만 열고, 인증 관리 API 같은 나머지 경로는 앱 서버에서만 부를 수 있게 막는다. 클라이언트 IP 헤더는 프록시가 덮어써서 감사 로그 IP를 꾸밀 수 없게 한다.
- **같은 OS에서 빌드해서 들고 들어간다.** standalone 결과물에는 OS·CPU별 바이너리가 들어가므로 설치 서버와 같은 환경에서 묶음을 만든다. 컨테이너 이미지, 런타임, 프록시 패키지까지 한 묶음으로 만들고 체크섬으로 대조한다.
- **버전은 고정해서 반입한다.** 자체 설치 구성 파일은 특정 커밋으로 고정하고, 그 커밋의 이미지 목록을 그대로 저장해 간다.

> [!NOTE]
> 클라우드와 폐쇄망에서 코드가 갈라지지 않게 하려고 했다. 차이는 환경변수와 주소뿐이고 앱 묶음은 같다.

## 외부 연동은 키가 없으면 꺼지는 선택 기능으로

그래도 바깥 서비스와 이어야 하는 기능이 있다. 오류 수집(Sentry), 휴대폰 알림(web-push), AI 글 다듬기, 공휴일 API, 외부 저장소 백업 등이다. 이런 기능은 모두 같은 방식으로 만들었다.

- **켜는 방법은 환경변수 하나.** 키가 있으면 켜지고, 없으면 꺼진다. 꺼져도 ERP는 그대로 동작한다.
- **꺼지면 화면에서도 사라진다.** 버튼과 메뉴를 숨긴다. 눌렀는데 오류가 나는 상태를 만들지 않는다.
- **업계 표준 규격만 쓴다.** 오류 수집은 Sentry DSN이라 sentry.io 대신 자체 설치형(Sentry self-hosted, GlitchTip)으로 주소만 바꾸면 된다. 백업은 S3 호환이라 MinIO나 NAS로 바꿀 수 있다. AI는 기본 주소 대신 사내 프록시 주소를 넣을 수 있게 했다.
- **상태는 보이되 비밀값은 안 보인다.** 관리자 설정의 연동 화면에서 켜짐·꺼짐만 보여 주고, DSN이나 키는 돌려주지 않는다.

```ts title="optional.ts (원리만 다시 쓴 예시)"
export const sentryOn = () => !!process.env.SENTRY_DSN;
export const pushOn = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const aiOn = () => !!process.env.AI_API_KEY;

// 서버 시작 때 — 키가 있을 때만 SDK 를 불러온다
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && sentryOn()) {
    const { initMonitor } = await import("./monitor");
    await initMonitor();
  }
}
```

SDK를 동적 import로 불러오면, 키가 없을 때 그 코드가 아예 실행되지 않으므로 초기화 중에 바깥으로 연결을 시도하는 일도 없다.

공휴일 API에는 대비책을 하나 더 뒀다. 키가 없거나 호출이 실패하면 DB에 넣어 둔 공휴일을 쓰고, 그해 값이 없으면 코드에 내장된 목록을 쓴다. 폐쇄망에서는 매년 공휴일을 SQL로 넣으면 된다.

웹 푸시는 사정이 조금 다르다. 서버가 보내는 것으로 끝나지 않고 휴대폰이 브라우저 회사의 푸시 서비스에 닿아야 해서, 완전 폐쇄망에서는 원리상 쓸 수 없다. 그래서 문서에 "완전 폐쇄망이면 끔"이라고 적었다. 앞 글의 웹 푸시가 키 없이는 구독과 발송을 모두 끄도록 만든 것도 이 때문이다.

> [!TIP]
> 선택 기능을 만들 때는 꺼진 상태를 먼저 만들어 확인하면 편하다. 키를 비운 채로 앱을 띄워서 화면에 깨진 버튼이 없는지, 로그에 바깥 연결 시도가 없는지 본 다음 키를 넣는다.

## 아직 남은 것

규칙은 정했어도 확인은 아직 다 하지 못했다. 개발 PC에서 standalone 빌드를 외부 주소 없이 실행해 로그인 검증 경로와 감사 기록이 동작하는 것까지는 봤다. 실제 Self-Hosted 인증·파일 서비스와의 연동은 인터넷을 막은 VM 한 대로 첫 설치 리허설을 해서 확인할 계획이다. 클라우드 파일 저장소에서 폐쇄망 저장소로 옮기는 복사 도구도 아직 없다.

## 정리

- 클라우드에서 운영하더라도 폐쇄망 설치가 가능하도록 규칙을 문서로 먼저 정했다.
- 라이선스는 MIT·Apache·BSD·ISC·OFL 허용 목록으로 두고, 의존성을 추가할 때마다 다시 센다.
- 실행 중에는 인터넷에 접속하지 않는다. 빌드 때 받는 Google Fonts도 폐쇄망 빌드를 막으므로 폰트를 파일로 넣었다.
- 플랫폼 전용 기능(KV·Blob·Cron 등)은 쓰지 않는다. 예약 작업은 앱 주소 하나를 두고 누가 부르든 같게 했다.
- Self-Hosted는 필요한 서비스만 띄우고, 프록시 하나로 바깥 경로를 좁히고, 같은 OS에서 빌드한 묶음을 고정 버전으로 반입한다.
- 외부 연동은 키가 없으면 꺼지는 선택 기능으로 만들고, 표준 규격을 써서 자체 설치형으로 바꿀 수 있게 했다.
