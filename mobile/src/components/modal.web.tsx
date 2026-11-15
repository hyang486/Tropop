import { createContext, useContext, useEffect } from 'react';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { Modal as RNModal } from 'react-native';

// Web only. RN-web's Modal portals to document.body with position: fixed, so inside the 402px phone frame
// (web-frame.web.tsx) a sheet spans the whole browser window. While the frame is up, render the sheet into the
// frame's own element instead; with no frame (phone-width viewer) the stock Modal is right.
export const FrameHostContext = createContext<HTMLElement | null>(null);

export function Modal(props: ComponentProps<typeof RNModal>) {
  const host = useContext(FrameHostContext);
  const { visible, onShow, onRequestClose, children } = props;
  useEffect(() => {
    if (host && visible) onShow?.({} as never);
  }, [host, visible, onShow]);
  useEffect(() => {
    if (!host || !visible || !onRequestClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose({} as never);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [host, visible, onRequestClose]);
  if (!host) return <RNModal {...props} />;
  if (!visible) return null;
  return createPortal(
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>{children}</div>,
    host,
  );
}
