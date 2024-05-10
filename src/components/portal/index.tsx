import { isBrowser } from "@_utils";
import { createRef } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children?: React.ReactNode;
}

export const globalBodyRef = createRef<HTMLBodyElement>();

export default function ({ children }: PortalProps) {
  return isBrowser() && createPortal(children, document.body);
}
