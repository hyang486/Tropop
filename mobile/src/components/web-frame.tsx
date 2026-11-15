import type { ReactNode } from 'react';

// Native: no frame. The web variant (web-frame.web.tsx) centers the app in a phone-width column.
export function WebFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
