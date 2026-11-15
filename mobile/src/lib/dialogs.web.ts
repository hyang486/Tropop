// Web (a .ts file on purpose: Metro tries 'dialogs.ts' before 'dialogs.web.tsx'): react-native-web has no working Alert or ActionSheetIOS. Same signatures as React Native, one queue, and
// <WebDialogHost /> (mounted once in the web frame) draws the card or the sheet (ux web-dialogs-spec).
import type { AlertButton, AlertOptions } from 'react-native';

export type ActionSheetOptions = {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number | number[];
};
export type Item =
  | { kind: 'alert'; title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions }
  | { kind: 'sheet'; config: ActionSheetOptions; callback: (index: number) => void };

let queue: Item[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const head = () => queue[0] ?? null;

function enqueue(item: Item) {
  queue = [...queue, item];
  emit();
}
export function close() {
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
