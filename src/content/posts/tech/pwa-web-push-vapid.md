---
title: "직원용 PWA에 웹 푸시 붙이기: VAPID 키 짝 검사까지"
description: "ERP 화면 알림을 휴대폰으로도 받게 직원용 PWA와 service worker, web-push 발송을 붙였다. 키가 없으면 구독과 발송을 모두 끄고, 공개키·비밀키가 한 쌍인지 서버에서 직접 계산해 확인하게 만든 과정을 정리했다."
date: 2026-10-17
category: "Tech/Web"
tags: ["pwa", "service-worker", "web-push", "vapid", "nextjs"]
series: "레거시 ERP 이관기"
seriesOrder: 8
draft: true
---

회사 ERP에는 화면 오른쪽 위에 종 아이콘 알림이 있다. 결재 요청이 오거나, 내가 올린 결재가 끝나거나, 경비가 지급되면 여기에 쌓인다. 문제는 ERP를 열어 둬야만 보인다는 점이다.

그래서 직원용 PWA를 만들고 웹 푸시로 같은 알림을 휴대폰에도 보내기로 했다. 작업은 AI 코딩 에이전트를 운영하며 함께 했다. 이 글은 구성, 발송 시점, 그리고 VAPID 키 짝 검사를 넣게 된 이유를 정리한 것이다.

## 구성

웹 푸시에는 네 가지가 필요하다.

- **manifest**: 홈 화면에 설치할 앱 정보. `start_url`을 직원 앱 첫 화면으로 두고 `display: "standalone"`으로 연다.
- **service worker**: 브라우저가 앱이 닫혀 있어도 깨워서 푸시를 전달하는 곳.
- **구독(subscription)**: 브라우저가 푸시 서비스(FCM, Apple, Mozilla)에서 받아 오는 주소와 암호화 키. 서버에 저장한다.
- **VAPID 키 한 쌍**: 서버가 "이 구독을 만든 그 서버"임을 증명하는 서명 키. 공개키는 브라우저가 구독할 때 쓰고, 비밀키는 서버가 보낼 때 쓴다.

직원 앱 첫 화면에는 영수증 찍기, 휴대폰 알림 켜기, 설치 안내를 두었다. 아이콘은 이미지 파일 대신 크기별로 그려 주는 라우트로 만들었다.

## service worker는 알림만 받는다

PWA라고 하면 오프라인 캐시를 먼저 떠올리지만 여기서는 일부러 뺐다. ERP 화면과 데이터는 로그인 정보와 엮여 있다. 공용 PC나 다른 사람이 쓰던 휴대폰에 화면이 캐시로 남는 것을 피하고 싶었다. service worker는 `push`와 `notificationclick` 두 이벤트만 처리한다.

```js title="sw.js (원리만 다시 쓴 예시)"
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: e.data?.text() ?? "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "알림", {
    body: d.body || "", tag: d.tag, icon: "/app-icon/192", data: { link: d.link || "/" },
  }));
});

// 열린 창이 있으면 그 창에서, 없으면 새 창으로 연다
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = wins.find((x) => new URL(x.url).origin === self.location.origin);
    if (w) { await w.focus(); return w.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
```

`tag`에는 알림 번호를 넣었다. 같은 알림이 두 번 와도 휴대폰에는 하나만 남는다. 그리고 `sw.js`는 응답 헤더를 `no-cache`로 두었다. 배포하면 바로 새 service worker를 받게 하려는 것이다. 앱 아이콘 주소는 로그인 검사 미들웨어의 제외 목록에 넣었다. 화면 주소가 아니니 로그인 페이지로 돌려보낼 이유가 없다. `sw.js`와 manifest는 확장자가 있는 주소라 원래 제외돼 있었다.

## 클라이언트: 언제 구독하고 언제 다시 보내나

권한 요청(`Notification.requestPermission`)은 사용자가 누른 버튼의 클릭 처리 안에서 불러야 한다. 그래서 [휴대폰 알림 켜기] 버튼에서만 묻는다. 이미 허용한 기기는 앱이 열릴 때마다 조용히 구독을 다시 서버로 보낸다. iOS는 구독이 만료되기도 하고, 서버 키가 바뀌면 옛 구독은 쓸 수 없기 때문이다.

```ts title="push-client.ts (원리만 다시 쓴 예시)"
const toBytes = (b64url: string) => {
  const b64 = (b64url + "=".repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

export async function subscribe(publicKey: string) {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const key = toBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // 서버 키가 바뀌었으면 옛 구독을 버린다
  const old = sub?.options.applicationServerKey;
  if (sub && old && !new Uint8Array(old).every((b, i) => b === key[i])) { await sub.unsubscribe(); sub = null; }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
}
```

지원 여부도 셋으로 나눴다. 일반 브라우저는 `serviceWorker`, `PushManager`, `Notification`이 있으면 된다. 아이폰은 iOS 16.4 이상에서, **홈 화면에 추가한 앱**으로 열었을 때만 웹 푸시가 된다. 그래서 아이폰 사파리로 그냥 열면 버튼 대신 설치 안내를 보여 준다.

## 서버: 커밋된 알림만, 응답이 끝난 뒤에

서버 쪽 구독 API는 세 개다. GET은 상태(켜짐 여부, 공개키, 내 기기 수), POST는 구독 저장, DELETE는 이 기기 구독 끊기. 구독은 `endpoint`를 키로 upsert한다. 같은 기기를 다른 직원이 쓰게 되면 주인이 바뀐다. `endpoint`가 `https://`로 시작하는지, 길이가 적당한지도 확인한다.

발송은 기존 화면 알림을 넣는 함수 끝에서 부른다. 여기서 순서가 중요했다. 알림은 결재 같은 업무 트랜잭션 안에서 들어간다. 그 자리에서 바로 푸시를 보내면, 트랜잭션이 롤백돼도 휴대폰에는 "결재가 승인됐습니다"가 이미 가 있다.

그래서 Next.js의 `after()`로 **요청 응답이 끝난 뒤** 보낸다. 보낼 때는 알림 번호로 DB를 다시 읽는다. 커밋된 알림만 읽히므로 롤백된 알림은 아무것도 가지 않는다. 푸시 실패는 로그만 남기고 삼킨다. 화면 알림은 이미 있기 때문이다. 푸시 서비스가 404나 410을 돌려주면 그 구독은 끝난 것이므로 지운다.

```ts title="push-send.ts (원리만 다시 쓴 예시)"
import webpush from "web-push";

export const pushEnabled = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export function sendAfterResponse(notificationIds: number[]) {
  if (!notificationIds.length || !pushEnabled()) return;
  after(() => send(notificationIds).catch((e) => console.error("[push]", e)));
}

async function send(ids: number[]) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const rows = await loadCommittedWithSubscriptions(ids); // 커밋된 알림 × 받는 사람의 구독
  const gone: string[] = [];
  await Promise.all(rows.map(async (r) => {
    try {
      await webpush.sendNotification(r.subscription, JSON.stringify({ title: r.title, body: r.body, link: r.link, tag: `n-${r.id}` }), { TTL: 24 * 3600 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(r.subscription.endpoint);
    }
  }));
  if (gone.length) await deleteSubscriptions(gone);
}
```

## 키가 없으면 전부 꺼진다

VAPID 키 두 개가 환경변수에 없으면 기능 전체가 꺼진다. GET은 `on: false`를 돌려주고, 화면은 버튼을 숨긴다. POST는 거절하고, 발송 함수는 아무것도 하지 않는다. 구독 표가 아직 없는 환경(마이그레이션 전)도 꺼진 것으로 본다. 표가 있는지는 `to_regclass`로 확인하고 1분 동안 기억한다.

이렇게 만든 이유는 이 ERP가 폐쇄망에도 설치될 수 있어서다. 웹 푸시는 휴대폰이 브라우저 회사의 푸시 서비스에 닿아야 동작한다. 완전 폐쇄망에서는 쓸 수 없으니 키를 비워 끄면 된다. 이 원칙은 다음 글에서 더 쓴다.

## VAPID 공개키·비밀키 짝 검사

발송까지 붙이고 나서 한 가지를 더 넣었다. 키는 `npx web-push generate-vapid-keys`로 한 쌍을 만들어 환경변수 두 칸에 나눠 넣는다. 사람이 복사해 붙여 넣는 과정이라 다른 쌍의 키를 섞어 넣을 수 있다. 개발용 공개키에 운영용 비밀키를 넣는 식이다.

이렇게 되면 증상이 애매하다. 브라우저는 공개키로 구독을 잘 만든다. 서버도 비밀키로 서명해서 잘 보낸다. 그런데 푸시 서비스가 서명이 구독의 공개키와 맞지 않는다며 거절한다. 설정 화면에는 "켜짐"으로 보이는데 알림만 안 온다.

VAPID 키는 P-256 타원곡선 키다. 비밀키가 있으면 공개키는 계산으로 정해진다. 그래서 서버에서 비밀키로 공개키를 다시 계산해 환경변수의 공개키와 비교하게 했다. Node의 `createECDH('prime256v1')`로 충분하다. `prime256v1`은 P-256의 OpenSSL 이름이다.

```ts title="vapid-pair.ts"
import { createECDH } from "node:crypto";

/** 공개키·비밀키가 한 쌍인가. 키가 없으면 null(꺼짐) */
export function vapidPairOk(publicKey?: string, privateKey?: string): boolean | null {
  if (!publicKey || !privateKey) return null;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    // 비압축 공개키(65바이트)를 base64url 로 — web-push 가 만드는 공개키와 같은 형식
    return ecdh.getPublicKey().toString("base64url") === publicKey.replace(/=+$/, "");
  } catch {
    return false; // 비밀키 형식이 틀림
  }
}
```

결과는 관리자 설정의 연동 화면에 보여 준다. 켜짐 여부, 짝이 맞는지, 등록된 기기 수다. 짝이 틀리면 경고를 띄운다. 이 API는 상태만 돌려주고 키 값은 돌려주지 않는다.

> [!WARNING]
> 비밀키는 서버 환경변수(민감 값)에만 둔다. 화면, DB, 로그, 상태 API 응답 어디에도 넣지 않는다. 짝 검사 결과도 true/false만 내보낸다.

키를 바꾸면 기존 구독은 옛 공개키로 만든 것이라 더 쓸 수 없다. 앞에서 쓴 대로 앱을 다시 열 때 클라이언트가 키가 달라진 것을 보고 새로 구독한다.

## 정리

- 화면 알림을 휴대폰으로도 보내려고 직원용 PWA와 웹 푸시를 붙였다.
- service worker는 푸시 받기와 알림 클릭만 처리한다. 로그인 정보와 엮인 화면은 캐시하지 않는다.
- `sw.js`는 캐시하지 않게 헤더를 두고, 로그인 검사 대상에서 뺐다.
- 권한은 버튼 클릭 안에서만 묻고, 허용한 기기는 앱을 열 때마다 구독을 다시 보낸다. 서버 키가 바뀌었으면 새로 구독한다.
- 발송은 응답이 끝난 뒤, 커밋된 알림만 다시 읽어서 한다. 404·410 구독은 지운다.
- VAPID 키가 없으면 구독·발송·버튼이 모두 꺼진다. 폐쇄망 설치는 키를 비우면 된다.
- 다른 쌍의 키를 섞어 넣는 실수는 비밀키로 공개키를 계산해 비교하는 짝 검사로 잡는다.
