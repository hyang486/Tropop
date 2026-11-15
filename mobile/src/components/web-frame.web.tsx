import type { ReactNode } from 'react';
import { View } from 'react-native';

// Web only: keep the mobile layout at any browser width.
export function WebFrame({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#ECE6DF', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', boxShadow: '0 0 24px rgba(0,0,0,0.12)' }}>
        {children}
      </View>
    </View>
  );
}
