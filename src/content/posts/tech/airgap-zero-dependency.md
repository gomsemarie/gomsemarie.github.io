---
title: "폐쇄망 반입 때문에 WebSocket 서버와 asar 읽기를 직접 짠 기준"
description: "반입 심사 때문에 ws, bcrypt, asar 라이브러리를 들이지 않고 node 기본 모듈로 직접 짰다. 그러다 RFC 상수 한 자리 오타로 클라이언트만 조용히 끊기던 버그도 겪었다."
date: 2026-08-21
category: "Tech/Node"
tags: ["node", "websocket", "electron", "dependency", "airgap"]
series: "사내 변환 도구 개발기"
seriesOrder: 13
---

## 하나 늘면 심사가 하나 는다

팀이 함께 쓰는 사내 변환 도구는 폐쇄망에 들어간다. 바깥과 선이 끊긴 곳이라 `npm install`을 쓸 수 없고, 들고 들어가는 모든 파일이 반입 심사를 거친다. 라이브러리를 하나 더 쓰면 그 라이브러리와 그것이 끌고 오는 트리 전체를 설명해야 한다.

그래서 이 저장소에는 "이것 하나 때문에 반입 심사를 통과할 꾸러미가 늘어난다"는 식의 주석이 여러 파일에 나온다. 그 판단으로 직접 짠 것들과, 직접 짰다가 크게 고생한 버그 하나를 적는다.

범위부터 밝혀 둔다. 의존성이 0개는 아니다. 서버는 HTTP 프레임워크와 `zod`, 인코딩 변환 라이브러리를 쓴다. 여기서 다루는 것은 쓰는 기능은 아주 좁은데 꾸러미는 큰 경우들이다.

## WebSocket 서버를 직접 짰다

데스크톱 앱에 외부 프로그램과 이야기할 창구가 필요했다. 다른 매크로 도구가 로컬 WebSocket으로 붙어서 조회나 변환을 시키는 구조다.

Node에는 WebSocket **클라이언트**만 내장돼 있고 서버는 없다. 보통은 `ws`를 쓴다. 그런데 우리가 쓰는 것은 텍스트 프레임 하나뿐이었다. 확장(permessage-deflate)도 서브프로토콜도 필요 없고, 양쪽을 우리가 다 만드니 협상할 상대도 없다.

RFC 6455에서 필요한 부분은 생각보다 작다. 손잡기 응답 하나, 프레임 읽기와 쓰기, 조각난 메시지 모으기다.

```ts title="handshake.ts"
import { createHash } from 'node:crypto';

// RFC 6455 §1.3 이 정한 값이다. 우리가 고르는 값이 아니다.
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export function acceptKey(clientKey: string): string {
  return createHash('sha1').update(clientKey + WS_GUID).digest('base64');
}

export function upgradeResponse(clientKey: string): string {
  return [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey(clientKey)}`,
    '',
    '',
  ].join('\r\n');
}
```

프레임 읽기에서 신경 쓴 것들이다.

- TCP는 메시지 단위로 오지 않는다. 반 개가 오기도 하고 두 개 반이 오기도 한다. 읽은 만큼만 프레임으로 내고 남은 바이트를 돌려줘서 다음 수신분과 이어 붙인다. 작은 메시지로만 시험하면 이 문제가 보이지 않는다.
- 가림(mask) 규칙은 방향마다 다르다. 클라이언트가 보내는 것은 반드시 가려져 있고, 서버가 보내는 것은 반드시 안 가려져 있다. 한쪽 규칙으로 양쪽을 읽으면 프레임이 그냥 사라진다.
- 길이 필드를 크게 적어 보내면 그만큼 기다리며 메모리를 잡는다. 주고받는 것이 JSON 한 덩이라 64MB가 넘으면 거절한다.

```ts title="read-frames.ts"
export function readFrames(buf: Buffer, requireMask = true) {
  const frames: { fin: boolean; opcode: number; payload: Buffer }[] = [];
  let at = 0;

  while (buf.length - at >= 2) {
    const fin = (buf[at]! & 0x80) !== 0;
    const opcode = buf[at]! & 0x0f;
    const masked = (buf[at + 1]! & 0x80) !== 0;
    let len = buf[at + 1]! & 0x7f;
    let p = at + 2;

    if (len === 126) {
      if (buf.length - p < 2) break;
      len = buf.readUInt16BE(p); p += 2;
    } else if (len === 127) {
      if (buf.length - p < 8) break;
      const big = buf.readBigUInt64BE(p);
      if (big > 64n * 1024n * 1024n) return null; // 너무 크면 끊는다
      len = Number(big); p += 8;
    }
    if (requireMask && !masked) return null;      // 규약 위반

    const mask = masked ? buf.subarray(p, p + 4) : null;
    if (masked) p += 4;
    if (buf.length - p < len) break;              // 아직 덜 왔다

    const payload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) payload[i] = mask ? buf[p + i]! ^ mask[i % 4]! : buf[p + i]!;
    frames.push({ fin, opcode, payload });
    at = p + len;
  }
  return { frames, rest: buf.subarray(at) };
}
```

## 상수 한 자리가 밀려 있었다

직접 짠 대가는 여기서 치렀다. 손잡기 GUID의 마지막 마디가 한 칸 밀려 있었다.

```txt title="guid-diff.txt"
틀린 값  258EAFA5-E914-47DA-95CA-5AB0DC85B11F
RFC 값   258EAFA5-E914-47DA-95CA-C5AB0DC85B11
```

앞의 `C`가 빠지고 뒤에 `F`가 붙어 있었다. 서버는 101을 정상으로 보내고, 서버 로그에는 아무것도 남지 않는다. 규약을 지키는 클라이언트는 `Sec-WebSocket-Accept` 값을 계산해 견주고, 맞지 않으니 조용히 연결을 끊는다. 우리 쪽에서 보이는 증상은 안 붙는다는 것 하나뿐이었다.

더 뼈아팠던 건 시험이 이걸 잡을 뻔했다는 점이다. 처음에는 RFC 문서의 예시 값으로 시험을 세웠다. 그 시험이 실패하자 상수를 의심하지 않고 예시를 잘못 옮겼나 싶어서 시험을 느슨하게 고쳤다. 남은 시험은 `acceptKey(a) === acceptKey(a)` 같은 모양이었다. 자기 자신과 견주니 상수가 무엇이든 통과했다.

외부 프로그램과 실물로 처음 붙여 보던 날 이 버그가 드러났다. 그때 고친 시험에는 RFC가 직접 적어 준 한 쌍을 박아 두었다.

```ts title="handshake.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptKey } from './handshake.ts';

test('RFC 6455 §1.3 의 예시 한 쌍과 같다', () => {
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});
```

> [!WARNING]
> 규약을 직접 구현할 때 시험의 기댓값은 반드시 바깥에서 가져와야 한다. 내 함수의 출력을 내 함수와 견주는 시험은 아무것도 지키지 못한다. 이 저장소에서 바깥에서 온 값은 RFC 예시 하나뿐이었는데, 그 하나를 지운 것이 사고로 이어졌다.

같은 작업에서 하나를 더 고쳤다. 예전에는 끊을 때 소켓을 바로 부쉈다. 그러면 상대는 정상 종료든 규약 위반이든 늘 `1006`(비정상 종료)만 본다. 이번 GUID 같은 버그를 짐작할 수 있는 단서가 그 코드뿐인데, 정상 종료도 같은 코드로 나오면 단서가 없어진다. 지금은 닫기 프레임에 사유 코드를 실어 보내고 끊는다(RFC 6455 §5.5.1).

## asar 목차를 30줄로 읽었다

배포할 때 버전을 사람이 적지 않게 하고 싶었다. 손으로 적으면 오타가 나고, 갱신은 번호 순서로 돌아서 한 번 어긋나면 뒤가 전부 어긋난다. 그래서 빌드가 직접 적은 `BUILD.json`을 Electron 꾸러미(`.asar`) 안에 넣고, 업로드 화면에서 그걸 읽는다.

Electron은 `fs`를 감싸서 `.asar`를 폴더처럼 읽게 해 준다. 그러니 `readFile(path.join(asar, 'BUILD.json'))`로도 아마 된다. 문제는 그 "아마"였다. 그 경로는 Electron 안에서만 동작해서 평범한 Node 시험으로는 확인할 수 없다.

asar 형식은 단순하다. 앞 16바이트에 길이 몇 개, 그 뒤에 JSON 목차, 그 뒤에 파일들이 온다. 목차의 `offset`은 파일 구역 시작점 기준이다.

```ts title="read-asar-entry.ts"
import { open } from 'node:fs/promises';

export async function readAsarEntry(asarPath: string, name: string): Promise<Buffer | null> {
  const fh = await open(asarPath, 'r');
  try {
    const head = Buffer.alloc(16);
    await fh.read(head, 0, 16, 0);
    if (head.readUInt32LE(0) !== 4) return null;   // asar 가 아니다

    const headerSize = head.readUInt32LE(4);
    const jsonSize = head.readUInt32LE(12);
    if (jsonSize === 0 || jsonSize > 16 * 1024 * 1024) return null;

    const json = Buffer.alloc(jsonSize);
    await fh.read(json, 0, jsonSize, 16);
    const entry = JSON.parse(json.toString('utf8')).files?.[name];
    if (!entry?.size) return null;

    const body = Buffer.alloc(entry.size);
    await fh.read(body, 0, entry.size, 8 + headerSize + Number(entry.offset));
    return body;
  } finally {
    await fh.close();
  }
}
```

의존성도 없고 시험도 된다. 그런데 이 파일에서도 한 번 문제가 났다. 현장에서 꾸러미를 고르자 "파일을 열지 못했습니다"가 떴다. Electron이 감싼 `fs`가 `.asar` 파일 자체를 폴더로 보고 열기를 거절했다. 평범한 Node로 도는 시험에는 감싸기가 없으니 늘 통과했다.

`process.noAsar`를 읽는 동안만 켜고 반드시 되돌리는 것으로 고쳤다. 평범한 Node에서는 아무 의미 없는 값이라 시험도 그대로 돈다. 재현되지 않는 현상 대신, 읽고 나면 원래 값으로 되돌린다는 약속을 시험으로 박았다.

> [!NOTE]
> 환경마다 다르게 도는 코드를 직접 짜서 시험할 수 있게 만든다는 판단 자체는 맞았다. 다만 파일을 여는 첫 줄이 바로 그 환경에 기대는 코드였다. 직접 짠다고 해서 실행 환경의 영향을 벗어나지는 않는다.

## 비밀번호와 서명은 node:crypto로

서버의 비밀번호 해시는 `bcrypt` 대신 `scrypt`를 쓴다. `bcrypt`는 네이티브 모듈이라 반입할 때 짐이 된다. 필요한 것은 해시 하나이고 `scrypt`는 Node에 이미 들어 있다. JWT도 `jsonwebtoken` 없이 HS256을 직접 만든다. 형식이 단순해서, 직접 만들면 무엇이 서명되는지가 오히려 잘 보인다.

라이선스는 Ed25519 서명이다. `node:crypto`에 들어 있어 의존성이 늘지 않고, 서명이 64바이트라 메일로 받아 붙여 넣는 한 줄짜리 형식에 들어간다. 반입물에는 공개키만 들어간다.

```ts title="license-sign.ts"
import { generateKeyPairSync, sign, verify, createPublicKey } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

export function issue(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(null, Buffer.from(body), privateKey).toString('base64url');
  return `LIC1.${body}.${sig}`;
}

export function check(line: string, spkiB64: string): boolean {
  const [magic, body, sig] = line.replace(/\s+/g, '').split('.');
  if (magic !== 'LIC1' || !body || !sig) return false;
  const key = createPublicKey({ key: Buffer.from(spkiB64, 'base64'), format: 'der', type: 'spki' });
  return verify(null, Buffer.from(body), key, Buffer.from(sig, 'base64url'));
}
```

엑셀 읽기도 같은 판단이었다. 필요한 것은 첫 시트의 값뿐이라 `node:zlib`로 ZIP을 풀고 `<row>` 단위로 잘라 읽는다. 수식, 서식, 병합은 다루지 않는다. 그 이상을 읽기 시작하면 그 파일이 라이브러리가 된다.

## 반입 꾸러미는 스크립트 하나로

반입은 몇 달에 한 번 하는 일이다. 그래서 할 때마다 절차를 다시 읽고, 그러다 한 줄을 빠뜨린다. 빠뜨려도 대개 티가 나지 않는다. 라이선스 공개키를 안 넣은 반입물도, 소스맵이 섞인 반입물도 겉보기엔 멀쩡하다. 둘 다 나중에 폐쇄망 안에서 드러난다.

그래서 꾸러미를 마는 스크립트를 하나 두었다. 사람이 고르는 값은 대상, 버전, 서명 키 파일, 만료일 넷이다. 나머지는 스크립트가 늘 같은 순서로 한다.

- 서버·클라이언트 빌드, 라이선스 발급, 가이드와 패치노트 담기
- 포터블 `node.exe`를 같이 넣는다. 서버 기계에 Node를 깔지 않아도 된다
- 초기 DB를 꾸러미 안에서 만들고 계정이 0개인지 센다
- 나가면 안 되는 것을 기계가 훑는다. 소스맵, `.env`, 개발용 키, `privateKey` 필드가 든 JSON
- 결과는 두 폴더로 나온다. 들고 들어갈 반입 폴더와, 소스맵과 발급 기록을 남길 보관 폴더다. 개인키는 어느 쪽에도 복사하지 않는다

```js title="assert-clean.mjs"
import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function findLeaks(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) { findLeaks(p, out); continue; }
    if (name.endsWith('.map')) out.push(`${p} — 소스맵`);
    if (name.startsWith('.env')) out.push(`${p} — 비밀`);
    if (name.endsWith('.json') && statSync(p).size < 4096) {
      try { if (JSON.parse(readFileSync(p, 'utf8')).privateKey) out.push(`${p} — 개인키`); } catch {}
    }
  }
  return out;
}
```

계정 0개 확인에는 부끄러운 사연이 있다. 이전 반입 시험에서 우리가 모르는 관리자 계정이 든 DB가 섞여 나갔다. 그래서 확인 단계를 만들었는데, 한동안 그 단계는 "계정 0개 확인"이라고 **찍기만** 했다. 세는 코드가 없었다. 막으려고 만든 단계가 아무것도 막지 않으면서 막았다고 출력하고 있었다. 지금은 실제로 세고, 계정 표가 없는 것도 실패로 본다. 표가 없으니 0이라고 넘기면 표 이름이 바뀌는 날 확인이 조용히 꺼진다.

Windows의 Node 24에서 `fs.cpSync`가 한글 경로에서 예외도 없이 프로세스를 죽이는 문제도 이 스크립트에서 만났다. 폴더 이름을 영문으로 바꾸면 간단하지만, 꾸러미를 여는 사람은 개발자가 아니다. 그래서 복사를 직접 폴더를 돌며 하는 함수로 바꿨다.

## 직접 짜는 게 나은 때

해 보고 나서 정리한 기준이다.

1. **쓰는 기능이 표준의 아주 작은 부분일 때.** WebSocket에서 텍스트 프레임만, xlsx에서 첫 시트 값만, asar에서 파일 하나만 쓰는 경우다. 없는 기능은 주석에 적어 둔다. 없는 것을 있는 척하지 않기 위해서다.
2. **Node가 이미 그 재료를 갖고 있을 때.** `crypto`, `zlib`, `fs` 같은 것들이다. 재료가 없으면 직접 짜지 않는다.
3. **직접 짜면 시험할 수 있게 될 때.** asar가 그랬다. 라이브러리나 런타임이 알아서 해 주는 동작에 기대는 코드는 확인할 수 없다.
4. **기댓값을 바깥에서 가져올 수 있을 때.** RFC 예시나 실물 파일이 있어야 한다. 이게 없으면 직접 짠 코드는 자기 자신만 검증한다.

반대로 HTTP 서버, 스키마 검증, 인코딩 변환은 직접 짜지 않았다. 범위가 넓고 엣지 케이스가 많아서, 반입 심사를 한 번 받는 쪽이 직접 짜서 유지하는 것보다 싸다.

> [!TIP]
> devDependency는 반입물에 실리지 않는다. 그래도 저장소 자체가 폐쇄망에 들어가는 경우라면 개발 의존성도 하나라도 덜 얹는 편이 낫다. 이 저장소는 렌더 시험에 `@testing-library/react` 대신 `react-dom/client`와 `act`만 썼다.

## 정리

- 폐쇄망에서는 라이브러리 하나가 반입 심사 하나다. 쓰는 기능이 좁으면 직접 짜는 편이 쌌다.
- WebSocket 서버는 손잡기, 프레임, 조각 모으기만 직접 짰다. TCP 분할, 방향별 mask, 길이 상한을 챙겼다.
- RFC GUID 한 자리 오타는 서버 쪽에 아무 흔적도 남기지 않았다. 기댓값이 자기 자신인 시험은 이걸 잡지 못했다.
- asar 목차를 30줄로 읽어 시험할 수 있게 만들었지만, 파일을 여는 첫 줄이 Electron에 의존했다. `process.noAsar`로 고쳤다.
- 비밀번호는 scrypt, JWT는 직접 만든 HS256, 라이선스는 Ed25519다. 전부 `node:crypto`로 했다.
- 반입 꾸러미는 스크립트 하나로 만다. 사람은 네 값만 고르고, 나가면 안 되는 것은 기계가 확인한다.
