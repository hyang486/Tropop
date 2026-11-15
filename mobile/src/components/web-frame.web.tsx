import { type ReactNode, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { FrameHostContext } from './modal.web';
import { WebDemoPanel } from './web-demo-panel';

const SCREEN_W = 402;
const SCREEN_H = 874; // iPhone 17 Pro, so every screen lays out as signed off on that device
const PANEL_W = 320;
const FULL_BLEED_BELOW = 720; // narrower than this the viewer is a phone: no frame, no gallery, app full-bleed

// Web only: a fixed 17 Pro screen scaled to fit the window (ux W4), with the demo panel beside it at >= 1024.
export function WebFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [host, setHost] = useState<HTMLElement | null>(null);
  if (width < FULL_BLEED_BELOW) return <View style={{ flex: 1, height: '100vh' as unknown as number }}>{children}</View>;
  const panel = width >= 1024 ? PANEL_W : 0;
  const scale = Math.max(0.6, Math.min(1, (height - 32) / SCREEN_H, (width - panel - 32) / SCREEN_W));
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'auto', // scrolls only when the 0.6 floor is hit; the fixed panel never adds page height
        boxSizing: 'border-box',
        display: 'flex',
        paddingLeft: panel,
        backgroundColor: '#ECE6DF',
      }}
    >
      <div style={{ zoom: scale, width: SCREEN_W, height: SCREEN_H, flexShrink: 0, margin: 'auto', display: 'flex', flexDirection: 'column' }}>
        <View ref={(el) => setHost((el as unknown as HTMLElement | null) ?? null)} style={{ flex: 1, overflow: 'hidden', borderRadius: 32, boxShadow: '0 0 24px rgba(0,0,0,0.12)' }}>
          <FrameHostContext.Provider value={host}>{children}</FrameHostContext.Provider>
        </View>
      </div>
      <WebDemoPanel />
    </div>
  );
}
