import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { colors } from '@/components/ui';

import { DEMO_DRAG_TYPE } from './web-demo-drag';

const FILES = [
  'group_photos_all_p01_p02_p03_p04_p05', 'group_photos_pair_p01_p03', 'group_photos_pair_p02_p04', 'group_photos_trio_p01_p04_p05',
  ...[1, 2, 3, 4, 5].flatMap((n) =>
    ['full_body_01', 'full_body_02', 'upper_body_01', 'upper_body_02'].map(
      (k) => `person_0${n}_${['white_man', 'black_man', 'asian_woman', 'white_woman', 'asian_man'][n - 1]}_p0${n}_${k}`,
    ),
  ),
].map((name) => `/demo-gallery/${name}.jpg`);

/** Web only (viewport >= 1024): sample photos to click, enlarge, or drag onto an upload area in the app. */
export function WebDemoPanel() {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<string | null>(null);
  const [present, setPresent] = useState(true);
  // The photos are local only (never committed); a dev server may answer a missing file with the app's HTML.
  useEffect(() => {
    fetch(FILES[0], { method: 'HEAD' })
      .then((r) => setPresent(r.ok && (r.headers.get('content-type') ?? '').startsWith('image/')))
      .catch(() => setPresent(false));
  }, []);
  if (width < 1024) return null;
  return (
    <>
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 320, overflowY: 'auto', padding: 16, boxSizing: 'border-box', fontFamily: "'SourceSans3-Regular', -apple-system, sans-serif", backgroundColor: colors.background, borderRight: `1px solid ${colors.separator}` }}>
        <div style={{ fontSize: 17, fontFamily: "'SourceSans3-Semibold', -apple-system, sans-serif", color: colors.label, marginBottom: 4 }}>Sample photos</div>
        <div style={{ fontSize: 13, lineHeight: '18px', color: colors.ink2, marginBottom: 12 }}>Click to enlarge. Drag onto Photos or Add QR in the app.</div>
        {!present ? (
          <div style={{ fontSize: 14, lineHeight: '20px', color: colors.ink2, padding: '24px 0' }}>No sample photos found. Put them in mobile/public/demo-gallery/ to use this panel.</div>
        ) : null}
        <div style={{ display: present ? 'grid' : 'none', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {FILES.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DEMO_DRAG_TYPE, src);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => setOpen(src)}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'grab' }}
            />
          ))}
        </div>
      </div>
      {open ? (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={open} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      ) : null}
    </>
  );
}
