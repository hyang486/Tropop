import type { ReactNode } from 'react';
import { View } from 'react-native';

import { WebDemoPanel } from './web-demo-panel';

// Web only: keep the mobile layout at any browser width; the demo panel sits beside the app column.
export function WebFrame({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#ECE6DF' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', boxShadow: '0 0 24px rgba(0,0,0,0.12)' }}>
        {children}
      </View>
      <WebDemoPanel />
    </View>
  );
}
