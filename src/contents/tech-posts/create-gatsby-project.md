---
slug: "first"
date: "2022-11-24"
title: "My first blog post"
description: This is an example of a Markdown page.
---

# My Markdown Page

This is an example of a Markdown page. You can use Markdown syntax to format the content of your pages.

## Subheading

Here's another section with a subheading. You can use various formatting options such as **bold**, _italic_, and `code` to add emphasis.

![GATSBY_EMPTY_ALT](../../assets/images/icon.png)

```tsx
import { useInsertionEffect } from "react";

// 컴포넌트
function MyButton() {
  function useCSS(rule) {
    useInsertionEffect(() => {
      // ... <style> 태그를 여기에서 주입하세요 ...
    });
    return rule;
  }

  const className = useCSS("...");
  return <div className={className} />;
}
```
