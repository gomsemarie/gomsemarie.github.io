---
title: "JWT는 15분 동안 거짓말을 한다: 계정 정지를 그 자리에서 반영하기"
description: "관리자가 계정을 정지해도 access 토큰이 만료될 때까지 창이 계속 동작하던 문제를, 요청마다 재확인·SSE 선통지·폴링 세 겹으로 막은 기록이다."
date: 2026-10-17
category: "Tech/Auth"
tags: ["jwt", "sse", "auth", "typescript", "node"]
---

## 정지했는데 계속 쓴다

팀이 함께 쓰는 사내 변환 도구가 있다. 서버 하나에 Electron 클라이언트가 붙는 구조다. 관리 화면에서 계정을 중지하면 "지금 쓰고 있는 세션도 함께 끊깁니다"라는 안내가 떴다.

실제로는 끊기지 않았다. 중지된 사람의 창은 변환을 계속했다.

인증 미들웨어가 토큰의 서명만 보고 계정은 보지 않았기 때문이다. access 토큰은 유효 시간 15분짜리 JWT다. 서명이 맞고 만료 전이면 서버는 믿었다. refresh에서는 계정을 다시 봤지만 그건 15분에 한 번 오는 일이다. 역할도 마찬가지였다. 토큰에 박힌 `role`을 믿으니 관리자를 내려도 만료까지는 관리자였다.

JWT를 쓰는 이유는 서버가 상태를 보지 않아도 된다는 데 있다. 정지와 강등은 바로 그 상태를 봐야 하는 일이다. 이 충돌을 세 겹으로 막았다.

## 세 겹 방어

### 1. 요청마다 DB를 다시 본다

이게 진짜 경계다. 서명 검증 뒤에 계정을 한 번 더 조회하고, 역할도 DB에서 읽는다.

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

요청마다 조회가 하나 늘지만 사용자가 한 팀 규모라 문제가 되지 않았다.

refresh의 검사 순서도 고쳤다. 중지하면 refresh 토큰도 폐기하는데, 폐기 여부를 먼저 보니 중지된 사람에게 "세션이 만료됐습니다"가 나갔다. 만료면 다시 로그인하면 되지만 중지면 관리자에게 물어야 한다. 그래서 계정 상태를 먼저 본다.

### 2. 바뀌면 서버가 먼저 말을 건다

1번은 사용자가 무언가를 누를 때만 동작한다. 가만히 열린 창은 아무것도 누르지 않는다. 그래서 SSE 통로를 하나 열어 두고, 관리자가 계정이나 권한을 바꾸면 그 사람의 열린 창 전부에 신호를 보낸다. 한 사람이 창을 여러 개 열 수 있어서 사용자별로 연결 묶음을 둔다.

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

관리자 라우트는 상태를 바꾼 뒤 `hub.send(userId, { type: 'access' })`만 부른다. WebSocket은 쓰지 않았다. 방향이 한쪽뿐이고, 클라이언트가 할 말은 이미 REST로 한다.

> [!WARNING]
> Fastify에서 `reply.hijack()` 후 `res.writeHead()`로 헤더를 쓰면 CORS 플러그인이 얹어 둔 헤더가 사라진다. 브라우저에는 `net::ERR_FAILED 200 (OK)`이 찍히고 서버 로그는 멀쩡하다. `access-control-*`와 `vary`를 손으로 옮겨 해결했다.

### 3. 폴링은 안전망이다

SSE는 끊길 수 있다. 재연결이 안 되는 구간을 위해 권한 조회에 5분 폴링을 걸고, 창에 포커스가 돌아올 때도 확인한다.

원래 "자동 갱신은 걸지 않는다"는 규칙이 있었지만 권한만은 예외로 뒀다. 다른 데이터는 낡아도 손해가 없는데, 권한은 낡으면 열리면 안 되는 쪽으로 열려 있다. 빠른 반영은 SSE가 맡으니 5분이면 충분했다.

## EventSource를 쓰지 않은 이유

`EventSource`는 요청 헤더를 붙일 수 없다. Bearer 토큰을 실으려면 쿼리스트링밖에 없고, 그러면 토큰이 접근 로그에 URL째로 남는다. 토큰은 15분이어도 로그는 더 오래 산다.

그래서 `fetch`로 스트림을 열고 몸통을 직접 읽었다. `EventSource`가 해 주던 프레임 조립과 재연결은 손으로 한다.

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

파서는 훅에서 떼어 냈다. 한 줄이 두 덩이로 나뉘어 오는 일은 가끔만 일어나서 손으로 눌러 보는 시험에는 안 걸린다. 함수로 빼면 덩이를 일부러 쪼개 넣는 시험을 쓸 수 있다. 이때 더한 시험 22개 중 9개가 이 조각 모으기 시험이었다.

재연결은 1초에서 두 배씩 늘려 30초에서 멈추고, 붙으면 1초로 되돌린다. 끊길 때마다 권한을 한 번 다시 묻는다. 못 들은 동안 바뀐 것이 있을 수 있어서다.

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

## "다시 물어봐라"만 보낸 이유

신호는 `{ type: 'access' }` 한 줄이다. 무엇이 바뀌었는지는 싣지 않는다. 받은 쪽은 쿼리를 무효화하고 답은 REST로 받는다.

권한은 전체 기능 차단과 사람별 제한, 두 층을 합쳐 정한다. 결과를 SSE에 싣기 시작하면 그 합치는 규칙이 통로마다 한 벌씩 생긴다. 규칙은 서버 한 곳에만 있어야 한다.

이 한 줄이 두 경우를 다 처리하기도 한다. 권한이 바뀌었으면 다시 물을 때 새 목록이 온다. 계정이 정지됐으면 그 요청이 401을 받고, 토큰 갱신이 실패하고, 로그인 화면으로 간다. 받는 쪽은 둘을 구분하지 않는다.

신호를 놓쳐도 잃는 것이 없다. 다음 신호나 폴링이 같은 일을 한다. 그래서 SSE 실패는 사용자에게 알리지 않는다.

## 트레이드오프

- 요청마다 DB를 본다. 사용자가 많아지면 캐시나 폐기 목록이 필요하다.
- 열린 창마다 서버가 연결을 하나씩 들고, 25초마다 ping을 흘린다.
- 재연결과 파서를 직접 짜고 시험해야 한다.
- 신호를 받으면 REST를 한 번 더 부른다. 대신 규칙이 한 곳에 남는다.

나중에 새 버전 출시 신호를 서버에 추가했는데 클라이언트 타입에는 넣지 않았다. 서버는 보내고 클라이언트는 모르는 신호라 버렸다. 양쪽 다 오류가 없었다. 타입을 서버와 맞추자 처리 안 된 갈래를 TypeScript가 바로 잡았다. 내용 없는 신호라도 종류 목록은 양쪽이 같은 정의를 봐야 한다.

## 정리

- JWT 유효 시간 동안은 서명만으로 정지를 막을 수 없다. 경계는 요청마다 계정을 다시 보는 쪽이다.
- 가만히 있는 창을 위해 서버가 SSE로 먼저 알린다.
- SSE가 끊긴 구간은 느린 폴링이 메운다.
- `EventSource` 대신 `fetch` 스트리밍을 써서 토큰이 URL에 남지 않게 했다.
- 신호는 "다시 물어봐라"만 싣고, 판정은 서버 한 곳에 둔다.
