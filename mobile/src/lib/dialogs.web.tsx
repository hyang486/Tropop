// Web: react-native-web has no working Alert or ActionSheetIOS. Same signatures as React Native, one queue, and
// <WebDialogHost /> (mounted once in the web frame) draws the card or the sheet (ux web-dialogs-spec).
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import type { AlertButton, AlertOptions } from 'react-native';

import { Modal } from '@/components/modal';
import { colors } from '@/components/ui';

type ActionSheetOptions = {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number | number[];
};
type Item =
  | { kind: 'alert'; title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions }
  | { kind: 'sheet'; config: ActionSheetOptions; callback: (index: number) => void };

let queue: Item[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const head = () => queue[0] ?? null;

function enqueue(item: Item) {
  queue = [...queue, item];
  emit();
}
function close() {
  queue = queue.slice(1);
  emit();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    enqueue({ kind: 'alert', title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }], options });
  },
};
export const ActionSheetIOS = {
  showActionSheetWithOptions(config: ActionSheetOptions, callback: (index: number) => void) {
    enqueue({ kind: 'sheet', config, callback });
  },
};

const FONT = { semibold: 'SourceSans3-Semibold', regular: 'SourceSans3-Regular' };
const KEYFRAMES = `@keyframes wd-fade{from{opacity:0}to{opacity:1}}@keyframes wd-slide{from{transform:translateY(100%)}to{transform:none}}
@media (prefers-reduced-motion: reduce){.wd-slide{animation:wd-fade 150ms ease-out !important}}`;

function useFocusTrap(onEscape: (() => void) | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = () => Array.from(root?.querySelectorAll<HTMLElement>('button') ?? []);
    const first = focusables().find((b) => b.dataset.destructive !== 'true') ?? focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) onEscape();
      if (e.key === 'Tab') {
        const list = focusables();
        if (list.length === 0) return;
        const i = list.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onEscape]);
  return ref;
}

const scrim = (children: ReactNode, align: 'center' | 'flex-end', onBackdrop?: () => void) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onBackdrop?.()}
    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-end', flexDirection: align === 'center' ? 'row' : 'column', backgroundColor: 'rgba(48,43,40,0.4)', animation: 'wd-fade 150ms ease-out' }}
  >
    <style>{KEYFRAMES}</style>
    {children}
  </div>
);

function AlertCard({ item }: { item: Extract<Item, { kind: 'alert' }> }) {
  const cancel = item.buttons.find((b) => b.style === 'cancel');
  const finish = (b?: AlertButton) => {
    close();
    b?.onPress?.();
  };
  const ref = useFocusTrap(cancel ? () => finish(cancel) : null);
  const stacked = item.buttons.length >= 3;
  const ordered = stacked ? [...item.buttons.filter((b) => b !== cancel), ...(cancel ? [cancel] : [])] : cancel ? [cancel, ...item.buttons.filter((b) => b !== cancel)] : item.buttons;
  const actions = item.buttons.filter((b) => b.style !== 'cancel');
  return scrim(
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="wd-title"
      aria-describedby={item.message ? 'wd-msg' : undefined}
      style={{ width: 300, maxWidth: 'calc(100% - 48px)', boxSizing: 'border-box', backgroundColor: '#FFFCF7', borderRadius: 20, padding: 20, border: `1.5px solid ${colors.label}`, display: 'flex', flexDirection: 'column' }}
    >
      <div id="wd-title" style={{ fontFamily: FONT.semibold, fontSize: 17, lineHeight: '22px', color: colors.label, textAlign: 'center' }}>{item.title}</div>
      {item.message ? <div id="wd-msg" style={{ fontFamily: FONT.regular, fontSize: 15, lineHeight: '20px', color: colors.secondaryLabel, textAlign: 'center', marginTop: 6 }}>{item.message}</div> : null}
      <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', gap: 8, marginTop: 16 }}>
        {ordered.map((b, i) => {
          const destructive = b.style === 'destructive';
          const primary = !destructive && b.style !== 'cancel' && actions.length === 1;
          const filled = destructive || primary;
          return (
            <button
              key={i}
              type="button"
              data-destructive={destructive}
              onClick={() => finish(b)}
              style={{ flex: 1, height: 44, borderRadius: 22, cursor: 'pointer', fontFamily: FONT.semibold, fontSize: 17, border: filled ? 'none' : `1.5px solid ${colors.label}`, backgroundColor: destructive ? colors.danger : primary ? colors.tint : 'transparent', color: filled ? '#FFFFFF' : colors.label }}
            >
              {b.text ?? 'OK'}
            </button>
          );
        })}
      </div>
    </div>,
    'center',
    cancel ? () => finish(cancel) : undefined,
  );
}

function SheetCard({ item }: { item: Extract<Item, { kind: 'sheet' }> }) {
  const { config, callback } = item;
  const { options, cancelButtonIndex, destructiveButtonIndex, title, message } = config;
  const destructive = Array.isArray(destructiveButtonIndex) ? destructiveButtonIndex : destructiveButtonIndex === undefined ? [] : [destructiveButtonIndex];
  const choose = (i: number) => {
    close();
    callback(i);
  };
  const dismiss = () => {
    close();
    if (cancelButtonIndex !== undefined) callback(cancelButtonIndex);
  };
  const ref = useFocusTrap(dismiss);
  const rowStyle = (i: number, last: boolean) => ({ width: '100%', height: 52, border: 'none', borderBottom: last ? 'none' : '1px solid #E6DED7', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: FONT.regular, fontSize: 17, color: destructive.includes(i) ? colors.errorText : colors.label }) as const;
  const rows = options.map((label, i) => ({ label, i })).filter(({ i }) => i !== cancelButtonIndex);
  return scrim(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title ?? undefined} className="wd-slide" style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#FFFCF7', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '8px 16px 24px', animation: 'wd-slide 200ms ease-out' }}>
      {title || message ? (
        <div style={{ fontFamily: FONT.regular, fontSize: 13, lineHeight: '18px', color: colors.secondaryLabel, textAlign: 'center', padding: '8px 0' }}>{[title, message].filter(Boolean).join('\n')}</div>
      ) : null}
      {rows.map(({ label, i }, k) => (
        <button key={i} type="button" role="button" data-destructive={destructive.includes(i)} onClick={() => choose(i)} style={rowStyle(i, k === rows.length - 1)}>{label}</button>
      ))}
      {cancelButtonIndex !== undefined ? (
        <button type="button" onClick={() => choose(cancelButtonIndex)} style={{ ...rowStyle(cancelButtonIndex, true), marginTop: 8, fontFamily: FONT.semibold }}>{options[cancelButtonIndex]}</button>
      ) : null}
    </div>,
    'flex-end',
    dismiss,
  );
}

/** Mounted once in the web frame; shows one dialog at a time, the rest wait their turn. */
export function WebDialogHost() {
  const item = useSyncExternalStore(subscribe, head, head);
  if (!item) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => undefined}>
      {item.kind === 'alert' ? <AlertCard item={item} /> : <SheetCard item={item} />}
    </Modal>
  );
}
