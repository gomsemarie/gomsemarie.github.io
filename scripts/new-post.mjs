#!/usr/bin/env node
// 새 글 파일을 만든다.
// 사용법: pnpm new <slug> "제목" [카테고리]
// 예시:  pnpm new react-compiler "React Compiler 써 보기" Tech/React
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [slug, title, category = "Tech"] = process.argv.slice(2);

if (!slug || !title) {
  console.error('사용법: pnpm new <slug> "제목" [카테고리]');
  console.error('예시:   pnpm new react-compiler "React Compiler 써 보기" Tech/React');
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`slug는 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다: ${slug}`);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const folder = category.split("/")[0].toLowerCase();
const file = join(root, "src/content/posts", folder, `${slug}.md`);

if (existsSync(file)) {
  console.error(`이미 있는 파일입니다: ${file}`);
  process.exit(1);
}

const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

const body = `---
title: "${title.replaceAll('"', '\\"')}"
description: ""
date: ${today}
category: "${category}"
tags: []
draft: true
---

`;

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, body);
console.log(`만들었습니다: src/content/posts/${folder}/${slug}.md`);
console.log("description을 채우고, 공개할 때 draft: true를 지우세요.");
