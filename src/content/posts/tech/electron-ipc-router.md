---
title: "Electron IDE의 IPC 라우터와 에러 메타데이터 복원"
description: "늘어나는 IPC 채널을 미들웨어 라우터로 묶었다. main에서 던진 에러의 category와 code가 renderer에서 사라지는 문제는 message에 JSON을 실어 preload에서 되살려 풀었고, 창 사이 store 동기화의 루프와 PTY 요청의 출처 검증도 손봤다."
date: 2026-06-16
category: "Tech/Electron"
tags: ["electron", "ipc", "zustand", "error-handling", "typescript"]
series: "Electron IDE 개발기"
seriesOrder: 3
---

Electron 앱에서 main process와 renderer는 IPC로 통신한다. IDE가 커지면서 파일 읽기, 감시, 검색, Git, 터미널까지 채널이 계속 늘었다. 그 IPC를 어떤 모양으로 묶었는지, 그리고 에러가 process 경계를 넘을 때 무엇이 빠졌는지 적는다.

이 코드는 Electron 공통 워크스페이스에 있다. 그 워크스페이스를 공통 패키지에서 떼어 낸 과정은 1편에 적었다.

## 라우터: 핸들러 등록과 미들웨어

2026년 4월에 main process를 정리하면서 창 관리, 로거, 메뉴와 함께 IPC 라우터를 만들었다. 하는 일은 단순하다.

- `handle(channel, fn)`: 핸들러를 모은다. 같은 채널을 두 번 등록하면 경고하고 덮어쓴다.
- `use(mw)`: 미들웨어를 쌓는다.
- `register()`: 모아 둔 핸들러를 한 번에 `ipcMain.handle`에 건다. register가 끝난 뒤에 `handle`을 부르면 바로 건다.
- `dispose()`, `remove()`: 걸어 둔 핸들러를 뗀다.

미들웨어는 Koa처럼 `(ctx, next)` 모양이다. 핸들러를 맨 안쪽에 두고 바깥에서 감싼다.

```ts title="ipc-router.ts"
type Ctx = { channel: string; event: IpcMainInvokeEvent; args: unknown[] };
type Middleware = (ctx: Ctx, next: () => Promise<unknown>) => Promise<unknown>;

class Router {
  private handlers = new Map<string, Handler>();
  private middleware: Middleware[] = [];

  use(mw: Middleware) { this.middleware.push(mw); return this; }

  private attach(channel: string, handler: Handler) {
    ipcMain.handle(channel, (event, ...args) => {
      const ctx = { channel, event, args };
      const run = this.middleware.reduceRight<() => Promise<unknown>>(
        (next, mw) => () => mw(ctx, next),
        () => this.call(handler, event, args, channel),
      );
      return run();
    });
  }
}
```

`reduceRight`로 접으면 먼저 `use`한 미들웨어가 가장 바깥에 온다. 지금 IDE가 쓰는 미들웨어는 로깅 하나로, 들어온 채널과 인자, 걸린 시간, 실패를 남긴다. 로그만 보면 미들웨어 없이도 남길 수 있다. 그래도 핸들러마다 같은 코드를 넣지 않아도 되고, 나중에 권한 검사 같은 것을 끼울 자리가 생겨서 이 모양으로 만들었다.

## 에러가 경계를 넘으면 정보가 빠진다

renderer에는 에러를 분류하는 공통 클래스가 있다. `category`(not-found, permission, validation 등), `code`, `severity`, `context`를 가진다. main 쪽 파일 시스템 코드도 Node의 errno를 같은 분류로 바꿔 던진다. `ENOENT`는 not-found, `EACCES`는 permission이 된다.

그런데 renderer에서 받아 보니 분류가 모두 사라져 있었다. 경로가 없다는 에러가 "예상하지 못한 오류"로 떴다. `ipcMain.handle`에서 던진 Error가 renderer로 넘어올 때 안정적으로 남는 것은 message와 name 정도이고, 직접 붙인 속성은 빠진다. message 앞에는 `Error invoking remote method '채널':` 같은 접두어까지 붙는다.

message만 남는다면 메타데이터를 message에 담으면 된다. main에서 던질 때 메타데이터를 JSON으로 만들어, 미리 정한 marker 뒤에 붙였다.

```ts title="serialize-error.ts"
const MARKER = '__APP_ERR__:';

function serializeError(err: unknown): Error {
  if (err instanceof Error && err.message.startsWith(MARKER)) return err; // 이중 포장 방지
  if (err instanceof Error) {
    const e = err as Error & Record<string, unknown>;
    const meta = {
      message: e.message, name: e.name,
      code: e.code, category: e.category, severity: e.severity, context: e.context,
    };
    if (meta.code || meta.category || meta.severity || meta.context !== undefined) {
      try { return new Error(MARKER + JSON.stringify(meta)); } catch { /* 원본 유지 */ }
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}
```

메타데이터가 없는 보통 Error는 손대지 않는다. JSON으로 바꿀 수 없는 context가 들어와도 원본을 그대로 던진다.

## preload에서 원래 Error로 되돌리기

되돌리는 일은 preload에서 했다. preload에는 invoke 채널을 감싸는 공통 함수가 있어서, 채널 이름 표를 넘기면 `ipcRenderer.invoke`를 부르는 메서드를 만들어 준다. 여기에 `.catch` 하나를 넣었다.

```ts title="preload-api.ts"
function restoreError(err: unknown): Error {
  if (!(err instanceof Error)) return new Error(String(err));
  // Electron이 붙인 접두어가 있어도 marker 뒤만 꺼낸다
  const m = err.message.match(new RegExp(`${MARKER}(.+)$`, 's'));
  if (!m) return err;
  try {
    const meta = JSON.parse(m[1]);
    const out = new Error(meta.message ?? err.message);
    if (meta.name) out.name = meta.name;
    for (const k of ['code', 'category', 'severity', 'context']) {
      if (meta[k] !== undefined) (out as any)[k] = meta[k];
    }
    return out;
  } catch {
    return err;
  }
}

api[method] = (...args) => ipcRenderer.invoke(channel, ...args).catch((e) => { throw restoreError(e); });
```

접두어는 정규식으로 건너뛴다. `startsWith`로 찾으면 접두어 때문에 marker를 찾지 못한다. 복원한 값은 일반 Error에 속성을 붙인 형태다. renderer의 에러 클래스는 정규화할 때 Error에 `category`나 `code` 속성이 있으면 그 값으로 다시 만든다. 그래서 main에서 던진 not-found가 renderer에서도 not-found로 보인다.

호출하는 쪽 코드는 하나도 바꾸지 않았다. preload 공통 함수를 거치는 채널 전부에 한 번에 적용됐다.

> [!WARNING]
> 직렬화는 허용 목록 방식이라 `code`, `category`, `severity`, `context` 네 개만 넘긴다. 파일 시스템 에러가 가진 `path`나 원본 errno는 `context`에 따로 넣지 않으면 넘어오지 않는다. 필드를 추가할 때는 main과 preload를 같이 고쳐야 한다. marker 문자열도 두 곳에 상수로 있어서 마찬가지다.

## 여러 창의 store 맞추기

IDE에는 런처 창과 작업 창처럼 창이 여러 개 있다. persist되는 zustand store를 여러 창이 쓰면 한 창에서 바꾼 값이 다른 창에도 반영되어야 한다. 그래서 renderer 쪽에 동기화 hook을 만들었다. main이 "이 key의 값이 바뀌었다"는 이벤트를 다른 창에 보내면, 받은 창이 자기 store에 `setState`한다.

이때 루프가 생긴다. B 창이 받은 값을 `setState`하면 B의 persist가 다시 저장하고, 그 저장이 broadcast되면 A가 받아서 또 저장한다. 그래서 받은 값을 반영하는 동안에만 켜지는 플래그를 두었다.

```ts title="use-sync-store.ts"
function useSyncStore<S, E>(cfg: {
  setState: (s: Partial<S>) => void;
  subscribe?: (cb: (e: E) => void) => () => void;
  filter: (e: E) => boolean;
  extract: (e: E) => Partial<S>;
}) {
  const syncing = useRef(false);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  useEffect(() => {
    if (!cfg.subscribe) return;
    return cfg.subscribe((e) => {
      const { filter, extract, setState } = cfgRef.current;
      if (!filter(e)) return;
      syncing.current = true;
      try { setState(extract(e)); } finally { syncing.current = false; }
    });
  }, [cfg.subscribe]);

  return { isSyncing: () => syncing.current };
}
```

저장하는 쪽에서 `isSyncing()`이 참이면 broadcast를 건너뛰게 해서 루프를 끊는다. 설정 객체는 ref에 두어 콜백이 바뀌어도 다시 구독하지 않게 했다.

> [!NOTE]
> 이 플래그는 `setState`가 동기로 도는 동안에만 켜져 있다. 받은 값을 반영하는 중간에 `await`가 끼면 플래그는 이미 꺼진 상태다. 그래서 동기화 경로에는 비동기 단계를 넣으면 안 된다. 워크스페이스를 옮길 때 확인해 보니 이 hook은 공통 워크스페이스에 있지만 지금 IDE 안에는 쓰는 곳이 없었다. 실제로 쓰게 되면 main 쪽 broadcast에서 보낸 창을 빼는 처리도 함께 넣는 편이 낫다.

## PTY: 요청을 보낸 창인지 확인한다

6월에 콘솔 패널의 터미널 탭에 실제 shell을 붙였다. main이 node-pty로 프로세스를 만들고, renderer는 id를 지정해 입력, 크기 변경, 종료를 요청한다.

shell, 작업 디렉토리, 환경변수는 main이 정하고, renderer가 보낼 수 있는 것은 stdin 데이터뿐이다. 인스턴스마다 그것을 만든 창의 `webContents`를 owner로 저장했다. id만 알면 다른 창의 터미널을 조작할 수 있는 상황을 막기 위해서다.

```ts title="pty-registry.ts"
type Entry = { pty: IPty; owner: WebContents };
const instances = new Map<string, Entry>();

function write(sender: WebContents, id: string, data: string) {
  const e = instances.get(id);
  if (!e || e.owner !== sender) return; // 다른 창의 요청은 무시
  e.pty.write(data);
}

// 출력도 owner에게만 보낸다
pty.onData((data) => {
  if (!owner.isDestroyed()) owner.send('terminal-data', { id, data });
});
```

IPC 핸들러의 첫 인자인 `event.sender`가 요청을 보낸 창이다. 라우터가 이 event를 그대로 넘기므로 핸들러는 `sender`를 서비스에 전달하기만 하면 된다. 크기 변경 값이 음수나 NaN이면 1 이상의 정수로 바꾸고, 가끔 나는 race 에러는 무시했다. 프로세스가 끝나면 종료 이벤트를 보내고 표에서 지운다. 앱을 끌 때는 모두 종료한다.

파일 감시 구독은 창이 먼저 사라지면 `destroyed` 이벤트로 정리한다. PTY에도 owner 기준으로 한꺼번에 종료하는 함수를 만들어 두었지만 아직 창 닫힘에는 연결하지 않았다. 남은 작업이다.

## 정리

- IPC 핸들러는 라우터에 모으고, 공통 처리는 `(ctx, next)` 미들웨어로 감쌌다. 지금 쓰는 미들웨어는 로깅 하나다.
- main에서 던진 에러는 renderer에 넘어오면서 message만 남았다. 메타데이터를 marker와 JSON으로 message에 담고, preload에서 접두어를 건너뛰어 되살렸다.
- 복원 코드를 preload 공통 함수에 넣어서, 호출하는 쪽을 고치지 않고 모든 채널에 적용했다.
- 창 사이 store 동기화에서는 "받은 값을 반영하는 중" 플래그로 루프를 끊었다. 이 플래그는 동기 구간에서만 유효하다.
- PTY는 인스턴스마다 만든 창을 owner로 기록하고, 요청한 `sender`가 owner와 같을 때만 입력, 크기 변경, 종료를 받았다.
