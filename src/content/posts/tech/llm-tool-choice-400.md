---
title: "'AI가 답하지 못했습니다'의 원인은 tool_choice였다"
description: "요청 글 AI 다듬기가 늘 실패했다. 특정 도구를 강제하는 tool_choice를 최신 모델이 400으로 거절하고 있었다. auto로 바꾸고, 글로 답해도 읽을 수 있게 파싱을 방어적으로 고쳤다."
date: 2026-10-17
category: "Tech/AI"
tags: ["llm", "tool-use", "claude-api", "debugging"]
series: "레거시 ERP 이관기"
seriesOrder: 11
---

ERP 요청 창구에 "AI로 다듬기" 버튼을 넣었다. 현업이 대충 쓴 요청 글을 유형별 칸(재현 단계, 기대 결과 등)에 맞게 정리해 주는 기능이다. 그런데 넣은 날부터 결과가 늘 같았다. "AI 가 답하지 못했습니다." 이 기능과 수정은 AI 코딩 에이전트와 함께 작업했다.

## 원인: 도구 강제가 400으로 거절됐다

다듬은 글은 칸 구조가 정해져 있다. 그래서 `submit_draft`라는 도구를 정의하고, 모델이 반드시 그 도구로 답하게 `tool_choice`를 걸었다.

```ts title="refine.ts (처음 코드, 예시)"
body: JSON.stringify({
  model, max_tokens: 2000, system, messages,
  tools: [submitDraftTool],
  tool_choice: { type: 'tool', name: 'submit_draft' },
}),
```

화면에 보인 문구는 HTTP 오류를 사용자용 문장으로 바꾼 것이었다. 401과 429가 아니면 모두 "답하지 못했습니다"로 뭉뚱그렸다. 서버 로그의 API 응답을 보니 400이었다. 우리가 쓰던 최신 모델은 특정 도구를 강제하는 `tool_choice`를 받지 않았다. 기본 모델 설정은 `claude-sonnet-5-5`였다.

> [!TIP]
> 오류를 사용자 문장으로 바꾸더라도 상태 코드와 API의 오류 메시지는 서버 로그에 남겨 둔다. 이번에는 그 한 줄로 원인을 바로 찾았다.

## 수정: auto + 시스템 지시 + 방어적 파싱

`tool_choice`를 `auto`로 바꿨다. 대신 시스템 지시의 마지막 줄에 "반드시 submit_draft 도구로만 답합니다"를 둔다. 이 문장은 처음부터 있었지만, 이제는 이것이 도구 사용을 유도하는 유일한 장치다.

`auto`면 모델이 도구 대신 글로 답할 수 있다. 그래서 응답을 두 단계로 읽게 했다. 먼저 `tool_use` 블록을 찾고, 없으면 글 답변 안에서 JSON 덩어리를 찾아 파싱한다.

```ts title="tool-output.ts"
function toolOutput(reply: Reply, name: string) {
  const used = reply.content?.find((c) => c.type === 'tool_use' && c.name === name)?.input;
  if (used) return used;
  // 글로 답했으면 본문 안의 JSON 을 찾아 읽는다
  const text = reply.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  try { return m ? JSON.parse(m[0]) : undefined; } catch { return undefined; }
}
```

파싱한 결과도 바로 믿지 않는다. `title`이 문자열인지 확인하고, 아니면 "AI 답을 읽지 못했습니다"로 실패시킨다. 이 함수는 이후 다른 AI 기능(한 칸 글 정리, 영수증 인식)에서도 같이 쓴다.

## 빈 응답은 이유를 남긴다

이틀 뒤 비슷한 일이 다른 곳에서 생겼다. 요청을 완료할 때 처리 내용을 한두 문장으로 요약하는 기능이다. 빠른 모델(`claude-haiku-5-5`)을 쓴다. 가끔 요약이 빈 글자로 돌아왔고, 화면에는 아무 설명이 없었다.

이번에는 원인을 짐작하기 전에 기록부터 남겼다. 답이 비면 모델 이름, `stop_reason`, 응답 블록 종류를 로그에 남기고, 사용자에게도 `stop_reason`을 붙여 알린다. 답 길이 상한도 300에서 1024 토큰으로 늘렸다. 그 뒤에는 요약에 "사실만 씁니다" 같은 혼잣말이 섞이는 문제도 보였다. `{"note": "..."}` 한 줄 JSON으로만 답하게 바꾸고, 그래도 섞이면 마지막 문단만 쓰게 했다.

## 지식은 시스템 프롬프트 앞에 캐시로

AI가 "급여 화면"처럼 모호하게 쓰는 것도 문제였다. 모든 호출의 시스템 프롬프트 앞에 우리 ERP 지식을 붙였다. 화면 목록(메뉴 묶음과 화면 이름, 주소)과, 관리자가 시스템 설정에서 직접 고치는 AI 안내문(용어, 회사 규칙)이다. 안내문은 코드 수정 없이 바꿀 수 있다.

```ts title="with-knowledge.ts"
export async function withKnowledge(task: string) {
  return [
    { type: 'text', text: await knowledgeText(), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: task },
  ];
}
```

지식은 거의 바뀌지 않으니 앞 블록에 두고 캐시한다. 이번 일의 지시는 뒤 블록이다. 순서를 이렇게 두어야 지시가 달라져도 앞부분 캐시를 다시 쓸 수 있다.

## 정리

- "답하지 못했습니다"는 400이었다. 최신 모델이 특정 도구를 강제하는 `tool_choice`를 거절했다.
- `tool_choice`는 `auto`로 두고, 시스템 지시로 도구 사용을 유도했다. 글로 답해도 본문 속 JSON을 찾아 읽고, 필수 필드를 검사한다.
- 빈 응답은 짐작하지 않고 `stop_reason`과 응답 블록 종류를 남겼다.
- 자주 안 바뀌는 ERP 지식과 관리자 안내문은 시스템 프롬프트 앞에 캐시 블록으로 붙였다.
