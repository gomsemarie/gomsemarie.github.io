import React from "react";
import { TagSpan } from "./style";

interface TagProps {
  color?: React.CSSProperties["color"];
  children?: React.ReactNode;
}
export default function Tag({ color, children }: TagProps) {
  return <TagSpan color={color}>{children}</TagSpan>;
}
