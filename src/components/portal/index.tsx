import { createPortal } from 'react-dom';

interface PortalProps {
  children?: React.ReactNode;
}
export default function ({ children }: PortalProps) {
  const portalRoot = document.body;
  return createPortal(children, portalRoot);
}
