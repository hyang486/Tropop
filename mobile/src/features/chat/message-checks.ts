import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/lib/dialogs';

import { en } from '@/i18n/en';
import { haptics } from '@/lib/haptics';
import { useRoomEvents } from '@/lib/room-channel';
import { supabase } from '@/lib/supabase';

import { nextChecksReady, type ReactionRowFull, splitReactionRows, summarizeChecks, toggleReactionRows } from './message-checks-plan';

/**
 * UX3-B09 (S3): the room's ink checks. Reads `message_reactions` through RLS (members only, live rooms only),
 * refetches on the room's change notices, and toggles through `toggle_message_check` with an optimistic update.
 */
export function useMessageChecks(roomId: string, userId: string | null | undefined) {
  const [rows, setRows] = useState<ReactionRowFull[]>([]);
  // Off until the first successful read, so a build without 0038 live behaves exactly as before.
  const [ready, setReady] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const { data, error } = await supabase
      .from('message_reactions')
      // `*`: `reaction` exists only once 0043 is live; splitReactionRows treats a missing column as the check.
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    // A newer load or a toggle in flight owns the state; a failed read keeps the rows shown.
    if (mine !== seq.current) return;
    if (error || !data) {
      if (!nextChecksReady(true, error)) setReady(false);
      return;
    }
    setReady(true);
    setRows(data as ReactionRowFull[]);
  }, [roomId]);

  useEffect(() => {
    // load only sets state after its first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useRoomEvents(roomId, (event) => {
    if (event.table === 'message_reactions') void load();
  });

  /** `withHaptic`: the double-tap path (UX3-B09 (a)); the context menu has the system's own feedback. */
  const toggle = useCallback(
    async (messageId: string, withHaptic: boolean) => {
      if (!userId || !ready) return;
      seq.current += 1;
      setRows((cur) => toggleReactionRows(cur, messageId, userId, 2));
      const { error } = await supabase.rpc('toggle_message_check', { p_message_id: messageId });
      if (error) {
        Alert.alert(en.chat.checkFailed);
        void load();
        return;
      }
      if (withHaptic) haptics.selection();
      void load();
    },
    [userId, ready, load],
  );

  /** B3: any of the 12 reactions (2 is "Got it", the old check). Needs 0043; before it the server refuses and the alert shows. */
  const react = useCallback(
    async (messageId: string, reaction: number) => {
      if (!userId || !ready) return;
      seq.current += 1;
      setRows((cur) => toggleReactionRows(cur, messageId, userId, reaction));
      const { error } = await supabase.rpc('toggle_message_reaction', { p_message_id: messageId, p_reaction: reaction });
      if (error) Alert.alert(en.chat.checkFailed);
      else haptics.selection();
      void load();
    },
    [userId, ready, load],
  );

  const split = useMemo(() => splitReactionRows(rows), [rows]);
  const checks = useMemo(() => summarizeChecks(split.checks, userId), [split, userId]);
  return { checks, reactions: split.reactions, toggle, react, ready };
}
