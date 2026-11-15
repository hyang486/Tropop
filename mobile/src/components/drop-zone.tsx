import type { ReactNode } from 'react';

export type DroppedFile = { uri: string; kind: 'photo' | 'video'; mimeType: string; fileName: string };

// Native: no drag and drop. The web build resolves drop-zone.web.tsx instead.
export function DropZone({ children }: { children: ReactNode; onFiles: (files: DroppedFile[]) => void; label: string; accept?: 'media' | 'image'; radius?: number }) {
  return <>{children}</>;
}
