import { type ReactNode, useRef, useState } from 'react';

import { colors } from '@/components/ui';

import type { DroppedFile } from './drop-zone';
import { DEMO_DRAG_TYPE } from './web-demo-drag';

export type { DroppedFile };

type Over = 'none' | 'ok' | 'bad';

function accepts(type: string, accept: 'media' | 'image') {
  return type.startsWith('image/') || (accept === 'media' && type.startsWith('video/'));
}

/** What is being dragged, from the types only (file contents are hidden until the drop). */
function peek(dt: DataTransfer, accept: 'media' | 'image'): Over {
  if (Array.from(dt.types).includes(DEMO_DRAG_TYPE)) return 'ok';
  const files = Array.from(dt.items).filter((i) => i.kind === 'file');
  if (files.length === 0) return 'none';
  return files.every((i) => accepts(i.type, accept)) ? 'ok' : 'bad';
}

async function filesFrom(dt: DataTransfer, accept: 'media' | 'image'): Promise<DroppedFile[]> {
  const out: DroppedFile[] = [];
  const toItem = (blob: Blob, name: string) => {
    if (!accepts(blob.type, accept)) return;
    out.push({
      uri: URL.createObjectURL(blob),
      kind: blob.type.startsWith('video/') ? 'video' : 'photo',
      mimeType: blob.type,
      fileName: name,
    });
  };
  for (const f of Array.from(dt.files)) toItem(f, f.name);
  const demo = dt.getData(DEMO_DRAG_TYPE);
  if (out.length === 0 && demo) {
    const blob = await (await fetch(demo)).blob();
    toItem(blob, decodeURIComponent(demo.split('/').pop() ?? 'photo.jpg'));
  }
  return out;
}

/** Web: a drop target around a screen. The app's own upload / crop flow runs unchanged on what is dropped. */
export function DropZone({
  children,
  onFiles,
  label,
  accept = 'media',
  radius = 0,
}: {
  children: ReactNode;
  onFiles: (files: DroppedFile[]) => void;
  label: string;
  accept?: 'media' | 'image';
  radius?: number;
}) {
  const [over, setOver] = useState<Over>('none');
  const depth = useRef(0);
  const reset = () => {
    depth.current = 0;
    setOver('none');
  };
  return (
    <div
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: radius }}
      onDragEnter={(e) => {
        depth.current += 1;
        setOver(peek(e.dataTransfer, accept));
      }}
      onDragOver={(e) => {
        const next = peek(e.dataTransfer, accept);
        if (next === 'none') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = next === 'ok' ? 'copy' : 'none';
      }}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) reset();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const ok = peek(e.dataTransfer, accept) === 'ok';
        const dt = e.dataTransfer;
        if (!ok) return reset();
        void filesFrom(dt, accept).then((files) => {
          if (files.length > 0) onFiles(files);
        });
        reset();
      }}
    >
      {children}
      {over !== 'none' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            pointerEvents: 'none',
            boxSizing: 'border-box',
            borderRadius: radius,
            border: `2px dashed ${over === 'ok' ? colors.tint : colors.separator}`,
            backgroundColor: over === 'ok' ? `${colors.tint}14` : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600, color: over === 'ok' ? colors.tint : colors.ink2 }}>
            {over === 'ok' ? label : 'Photos only'}
          </span>
        </div>
      ) : null}
    </div>
  );
}
