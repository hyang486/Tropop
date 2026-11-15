import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { WebDemoPanel } from './web-demo-panel';

const SCREEN_W = 402;
const SCREEN_H = 874; // iPhone 17 Pro, so every screen lays out as signed off on that device
const PANEL_W = 320;

// Web only: a fixed 17 Pro screen scaled to fit the window (ux W4), with the demo panel beside it at >= 1024.
export function WebFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const panel = width >= 1024 ? PANEL_W : 0;
  const scale = Math.max(0.6, Math.min(1, (height - 32) / SCREEN_H, (width - panel - 32) / SCREEN_W));
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'auto', // scrolls only when the 0.6 floor is hit; the fixed panel never adds page height
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: panel,
        backgroundColor: '#ECE6DF',
      }}
    >
      <div style={{ zoom: scale, width: SCREEN_W, height: SCREEN_H, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: 32, boxShadow: '0 0 24px rgba(0,0,0,0.12)' }}>{children}</View>
      </div>
      <WebDemoPanel />
    </div>
  );
}
