import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { QCard, QLabel } from '@/components/q-screen';
import { colors } from '@/components/ui';
import { eventStrings } from '@/features/event/strings';

import type { RecapMark, SavedRecap } from './recap-plan';
import { loadMark, loadSavedRecap } from './recap-store';

const s = eventStrings.recap;

type Loaded = { roomId: string; saved: SavedRecap | null; mark: RecapMark | null };

/**
 * The saved recap on the Room ended screen (spec 3.3), read from this phone. "No recap was saved" only for rooms
 * this phone knows had Qrewing AI on; other rooms show nothing.
 */
export function SavedRecapCard({ roomId }: { roomId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadSavedRecap(roomId), loadMark(roomId)]).then(([saved, mark]) => {
      if (alive) setLoaded({ roomId, saved, mark });
    });
    return () => {
      alive = false;
    };
  }, [roomId]);

  if (!loaded || loaded.roomId !== roomId) return null;
  const { saved, mark } = loaded;
  if (!saved) {
    return mark?.ai ? <Text style={styles.line}>{s.none}</Text> : null;
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
        {saved.server.highlights.map((h) => (
          <Text key={h} style={styles.body}>
            {`•  ${h}`}
          </Text>
        ))}
      </QCard>
      {mine.length > 0 ? (
        <>
          <QLabel>{s.you}</QLabel>
          <QCard>
            {mine.map((line) => (
              <Text key={line} style={styles.body}>
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
