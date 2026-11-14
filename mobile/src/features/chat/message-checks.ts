import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { en } from '@/i18n/en';
import { haptics } from '@/lib/haptics';
import { useRoomEvents } from '@/lib/room-channel';
import { supabase } from '@/lib/supabase';

import { type CheckRow, summarizeChecks, toggleCheckRows } from './message-checks-plan';

/**
 * UX3-B09 (S3): the room's ink checks. Reads `message_reactions` through RLS (members only, live rooms only),
 * refetches on the room's change notices, and toggles through `toggle_message_check` with an optimistic update.
 */
export function useMessageChecks(roomId: string, userId: string | null | undefined) {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    // A newer load or a toggle in flight owns the state; a failed read keeps what is shown.
    if (mine !== seq.current || error || !data) return;
    setRows(data);
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRoomEvents(roomId, (event) => {
    if (event.table === 'message_reactions') void load();
  });

  /** `withHaptic`: the double-tap path (UX3-B09 (a)); the context menu has the system's own feedback. */
  const toggle = useCallback(
    async (messageId: string, withHaptic: boolean) => {
      if (!userId) return;
      seq.current += 1;
      setRows((cur) => toggleCheckRows(cur, messageId, userId));
      const { error } = await supabase.rpc('toggle_message_check', { p_message_id: messageId });
      if (error) {
        Alert.alert(en.chat.checkFailed);
        void load();
        return;
      }
      if (withHaptic) haptics.selection();
      void load();
    },
    [userId, load],
  );

  const checks = useMemo(() => summarizeChecks(rows, userId), [rows, userId]);
  return { checks, toggle };
}
