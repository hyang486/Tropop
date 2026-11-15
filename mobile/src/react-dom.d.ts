// The web Modal wrapper only needs createPortal; @types/react-dom is not a dependency.
declare module 'react-dom' {
  import type { ReactNode } from 'react';
  export function createPortal(children: ReactNode, container: Element): ReactNode;
}
