import type { ReactNode } from 'react';

// Web-only stub: SwiftUI hosts do not exist on web. Pickers render nothing; wrappers pass children through.
export const Host = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const RNHostView = Host;
export const DatePicker = () => null;
export const Button = () => null;
export const ContextMenu = Object.assign(Host, { Items: () => null, Trigger: Host });
