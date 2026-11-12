import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { QCard, QLabel } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { eventStrings } from '@/features/event/strings';
import { useAuth } from '@/lib/auth';

import { type RecapMark, type RecapMiss, recapCardView, type SavedRecap } from './recap-plan';
import { loadMark, loadSavedRecap, recapForEndedRoom } from './recap-store';

const s = eventStrings.recap;

type Loaded = { roomId: string; saved: SavedRecap | null; mark: RecapMark | null; miss: RecapMiss | null };

/**
 * The saved recap on the Room ended screen (spec 3.3), read from this phone. "No recap was saved" only for rooms
 * this phone knows had Qrewing AI on; other rooms show nothing. After the server deleted the room both reads fail
 * quietly, so only the phone's copy remains.
 */
export function SavedRecapCard({ roomId }: { roomId: string }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [tick, setTick] = useState(0);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [stored, mark] = await Promise.all([loadSavedRecap(roomId), loadMark(roomId)]);
      let saved = stored;
      let miss: RecapMiss | null = null;
      // Early end (spec 7): the room is readable for 30 minutes, but room notices stop at the end, so a member
      // who missed the recap reads the row (grace read policy), and asks once if there is none yet.
      if (!saved && mark?.ai && userId) {
        const res = await recapForEndedRoom(roomId, userId);
        if ('saved' in res) saved = res.saved;
        else miss = res.miss;
      }
      if (alive) setLoaded({ roomId, saved, mark, miss });
    })()
      .catch(() => {})
      .finally(() => alive && setRetrying(false));
    return () => {
      alive = false;
    };
  }, [roomId, userId, tick]);

  if (!loaded || loaded.roomId !== roomId) return null;
  const { saved, mark, miss } = loaded;
  const view = recapCardView(saved !== null, mark?.ai === true, miss);
  if (view === 'hidden') return null;
  if (view === 'none') return <Text style={styles.line}>{s.none}</Text>;
  if (view === 'pending' || view === 'offline' || !saved) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.line}>{view === 'pending' ? s.pending : s.offline}</Text>
        <Button
          title={s.retry}
          variant="secondary"
          busy={retrying}
          onPress={() => {
            setRetrying(true);
            setTick((n) => n + 1);
          }}
        />
      </View>
    );
  }
  const me = saved.me;
  const mine = [
    me.messages !== null ? s.messages(me.messages) : null,
    me.mediaShared !== null ? s.media(me.mediaShared) : null,
    me.photosOfMe !== null ? s.photosOfMe(me.photosOfMe) : null,
    me.arrivedAt ? s.arrived(new Date(me.arrivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) : null,
    me.pace,
  ].filter((x): x is string => !!x);

  return (
    <View style={styles.wrap}>
      <QLabel>{s.title}</QLabel>
      <QCard>
        <Text style={styles.title}>{saved.server.title}</Text>
        <Text style={styles.body}>{saved.server.summary}</Text>
        {saved.server.highlights.map((h, i) => (
          <Text key={i} style={styles.body}>
            {`•  ${h}`}
          </Text>
        ))}
      </QCard>
      {mine.length > 0 ? (
        <>
          <QLabel>{s.you}</QLabel>
          <QCard>
            {mine.map((line, i) => (
              <Text key={i} style={styles.body}>
                {line}
              </Text>
            ))}
          </QCard>
        </>
      ) : null}
      <Text style={styles.line}>{s.savedHere}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 17, fontWeight: '600', color: colors.label, marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 21, color: colors.label },
  line: { fontSize: 15, lineHeight: 21, color: colors.secondaryLabel },
});
