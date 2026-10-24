---
title: "계정 정지를 JWT 만료 전에 바로 반영하기"
description: "관리자가 계정을 정지해도 access 토큰이 만료될 때까지 창이 계속 동작했다. 요청마다 계정을 다시 확인하고, SSE로 먼저 알리고, 5분 폴링을 더해 막았다."
date: 2026-08-07
category: "Tech/Auth"
tags: ["jwt", "sse", "auth", "typescript", "node"]
series: "사내 변환 도구 개발기"
seriesOrder: 10
---

## 정지된 계정으로 계속 변환이 됐다

팀이 함께 쓰는 사내 변환 도구가 있다. 서버 하나에 Electron 클라이언트가 붙는 구조다. 관리 화면에서 계정을 중지하면 "지금 쓰고 있는 세션도 함께 끊깁니다"라는 안내가 떴다.

실제로는 끊기지 않았고, 중지된 사람의 창에서 변환이 계속 돌았다.

인증 미들웨어가 토큰의 서명만 확인하고 계정 상태는 보지 않았다. access 토큰은 유효 시간 15분짜리 JWT라서, 서명이 맞고 만료 전이면 서버는 그대로 통과시켰다. refresh 때는 계정을 다시 조회했지만 refresh는 15분에 한 번 온다. 역할도 같은 문제가 있었다. 토큰에 든 `role`을 그대로 쓰니 관리자 권한을 빼도 토큰이 만료될 때까지는 관리자로 동작했다.

JWT는 서버가 상태를 조회하지 않아도 되게 하려고 쓰는데, 정지와 강등은 상태를 조회해야 알 수 있다. 그래서 아래처럼 세 단계로 나눠 막았다.

## 세 단계로 막기

### 1. 요청마다 DB를 다시 본다

실제로 접근을 막는 곳은 여기다. 서명을 검증한 다음 계정을 한 번 더 조회하고, 역할도 DB에서 읽는다.

```ts title="auth.ts"
export function authenticate(header: string | undefined): Claims | null {
  if (!header?.startsWith('Bearer ')) return null;

  const v = verifyJwt(header.slice(7));
  if (!v.ok || v.claims.typ !== 'access') return null;

  // 서명이 맞아도 계정은 다시 본다
  const account = accounts.find(v.claims.sub);
  if (!account || account.status !== 'active') return null;

  // 역할은 토큰이 아니라 지금의 DB 값이다
  return { ...v.claims, role: account.role };
}
```

요청마다 조회가 하나 늘지만 사용자가 한 팀 규모라 부담은 없었다.

refresh의 검사 순서도 바꿨다. 계정을 중지하면 refresh 토큰도 함께 폐기하는데, 폐기 여부를 먼저 검사하다 보니 중지된 사람에게 "세션이 만료됐습니다"라는 안내가 나갔다. 만료라면 다시 로그인하면 되지만 중지라면 관리자에게 문의해야 하므로, 계정 상태를 먼저 보도록 했다.

### 2. 상태가 바뀌면 서버가 먼저 알린다

1번은 사용자가 무언가를 눌러 요청을 보낼 때만 동작한다. 창을 열어만 두고 있으면 요청이 없다. 그래서 SSE 연결을 하나 열어 두고, 관리자가 계정이나 권한을 바꾸면 그 사람이 열어 둔 창 전부에 신호를 보낸다. 한 사람이 창을 여러 개 열 수 있으니 연결은 사용자별로 묶어 관리한다.

```ts title="event-hub.ts"
import type { ServerResponse } from 'node:http';

export function createEventHub() {
  const rooms = new Map<string, Set<ServerResponse>>();

  // 소켓은 조용히 죽는다. 주석 줄을 흘려 죽은 연결을 드러낸다
  setInterval(() => {
    for (const set of rooms.values()) for (const res of set) res.write(': ping\n\n');
  }, 25_000).unref();

  return {
    add(userId: string, res: ServerResponse) {
      const set = rooms.get(userId) ?? new Set<ServerResponse>();
      rooms.set(userId, set.add(res));
      return () => {
        set.delete(res);
        if (set.size === 0) rooms.delete(userId);
      };
    },
    send(userId: string, ev: { type: string }) {
      for (const res of rooms.get(userId) ?? []) res.write(`data: ${JSON.stringify(ev)}\n\n`);
    },
  };
}
```

관리자 라우트는 상태를 바꾼 뒤 `hub.send(userId, { type: 'access' })`만 호출한다. WebSocket은 쓰지 않았다. 서버에서 클라이언트로만 보내면 되고, 클라이언트 쪽 요청은 이미 REST로 처리하고 있다.

> [!WARNING]
> Fastify에서 `reply.hijack()` 후 `res.writeHead()`로 헤더를 쓰면 CORS 플러그인이 얹어 둔 헤더가 사라진다. 브라우저에는 `net::ERR_FAILED 200 (OK)`이 찍히고 서버 로그는 멀쩡하다. `access-control-*`와 `vary`를 손으로 옮겨 해결했다.

### 3. 폴링으로 빈틈을 메운다

SSE 연결은 끊길 수 있다. 재연결이 안 되는 동안을 대비해 권한 조회에 5분 간격 폴링을 걸고, 창에 포커스가 돌아올 때도 다시 확인한다.

원래 "자동 갱신은 걸지 않는다"는 규칙이 있었는데 권한만 예외로 했다. 다른 데이터는 조금 늦게 바뀌어도 손해가 없지만, 권한 정보가 늦으면 막혀야 할 기능이 열린 채로 남는다. 빠른 반영은 SSE가 하니 폴링 간격은 5분으로 충분했다.

## EventSource를 쓰지 않은 이유

`EventSource`로는 요청 헤더를 붙일 수 없다. Bearer 토큰을 보내려면 쿼리스트링에 넣어야 하는데, 그러면 접근 로그에 URL과 함께 토큰이 남는다. 토큰은 15분 뒤 만료돼도 로그는 훨씬 오래 보관된다.

그래서 `fetch`로 스트림을 열고 응답 본문을 직접 읽었다. `EventSource`가 해 주던 프레임 조립과 재연결은 직접 구현했다.

```ts title="sse-parser.ts"
export function createSseParser() {
  let buf = '';
  return {
    push(chunk: string): { type: string }[] {
      buf += chunk;
      const out: { type: string }[] = [];
      let cut: number;
      while ((cut = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue; // ': ping' 은 주석이다
          try {
            out.push(JSON.parse(line.slice(5).trim()));
          } catch {
            // 모르는 줄은 버린다
          }
        }
      }
      return out;
    },
  };
}
```

파서는 훅에서 분리했다. 한 줄이 두 조각으로 나뉘어 도착하는 경우는 드물어서 직접 눌러 보는 확인으로는 잡히지 않는다. 함수로 떼어 두면 데이터를 일부러 쪼개 넣는 시험을 쓸 수 있다. 이때 추가한 시험 22개 중 9개가 조각을 이어 붙이는 경우를 다룬다.

재연결 간격은 1초에서 시작해 두 배씩 늘리다 30초에서 멈추고, 연결되면 1초로 되돌린다. 끊길 때마다 권한을 한 번 다시 조회한다. 연결이 끊긴 사이에 바뀐 것이 있을 수 있기 때문이다.

```ts title="useServerEvents.ts"
const connect = async () => {
  try {
    const res = await fetch(`${API}/me/events`, {
      headers: { authorization: `Bearer ${getToken()}` },
      signal: ac.signal,
    });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    wait = 1_000;
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    const parser = createSseParser();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(value).forEach(handle);
    }
  } catch {}
  if (stopped) return;
  queryClient.invalidateQueries({ queryKey: ['my-features'] });
  timer = setTimeout(connect, wait);
  wait = Math.min(wait * 2, 30_000);
};
```

> [!NOTE]
> 클라이언트가 Electron 렌더러라 `TextDecoderStream` 호환성은 따지지 않았다. 일반 웹이라면 지원 범위를 먼저 봐야 한다.

## 신호에 내용을 싣지 않은 이유

신호는 `{ type: 'access' }` 한 줄이고, 무엇이 바뀌었는지는 담지 않는다. 받은 쪽은 쿼리를 무효화하고 새 값은 REST로 받아 온다.

권한은 전체 기능 차단과 사람별 제한을 합쳐서 정한다. 계산 결과를 SSE에 실으면 이 합치는 규칙을 SSE 쪽에도 따로 구현해야 한다. 규칙은 서버의 한 곳에만 두고 싶었다.

이 신호 하나로 두 경우를 모두 처리할 수 있다. 권한이 바뀌었으면 다시 조회할 때 새 목록이 온다. 계정이 정지됐으면 그 조회가 401을 받고, 토큰 갱신이 실패해 로그인 화면으로 돌아간다. 받는 쪽에서 둘을 구분할 필요가 없다.

신호를 하나 놓쳐도 다음 신호나 폴링이 같은 일을 하므로 문제가 없다. 그래서 SSE 연결 실패는 사용자에게 알리지 않는다.

## 트레이드오프

- 요청마다 DB를 본다. 사용자가 많아지면 캐시나 폐기 목록이 필요하다.
- 열린 창마다 서버가 연결을 하나씩 들고, 25초마다 ping을 흘린다.
- 재연결과 파서를 직접 작성하고 시험해야 한다.
- 신호를 받으면 REST를 한 번 더 호출한다. 그 대신 권한 규칙은 서버 한 곳에만 있다.

나중에 새 버전 출시 신호를 서버에 추가하면서 클라이언트 타입에는 넣지 않은 일이 있었다. 서버는 신호를 보냈고 클라이언트는 모르는 종류라서 버렸는데, 양쪽 모두 오류를 내지 않았다. 클라이언트 타입을 서버와 맞추자 처리하지 않은 경우를 TypeScript가 바로 찾아 줬다. 내용 없는 신호라도 신호 종류 목록은 서버와 클라이언트가 같은 정의를 써야 한다.

## 정리

- JWT 유효 시간 안에는 서명 검증만으로 정지된 계정을 막을 수 없다. 요청마다 계정을 다시 조회해서 막는다.
- 요청을 보내지 않는 창에는 서버가 SSE로 먼저 알린다.
- SSE가 끊긴 동안은 5분 간격 폴링으로 보완한다.
- `EventSource` 대신 `fetch` 스트리밍을 써서 토큰이 URL에 남지 않게 했다.
- 신호에는 "다시 조회하라"는 뜻만 담고, 권한 판정은 서버 한 곳에서 한다.
