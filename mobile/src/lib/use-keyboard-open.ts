import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** True while the software keyboard is shown (iOS will-show/will-hide, so layout changes with the animation). */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
