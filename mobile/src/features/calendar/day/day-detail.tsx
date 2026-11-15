import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { Button, colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { useNow } from '@/lib/use-now';
import type { DateKey } from '../calendar-plan';
import { useCalendar, usePlanState } from '../calendar-store';
import { plusIntroHref } from '../plus-intro';
import { HeroCard } from '../hero-card';
import { AddNext } from './add-next';
import {
  addNextParams, dayEvents, dayRooms, dayTitle, eventTimeText, recapState, roomIsLive, roomPlace, roomTime, roomTimeSpoken,
} from './day-detail-model';
import { RecapCard } from './recap-card';

const t = en.calendar;

/** Day detail body (calendar-v2-spec §B): rooms by start with recap and Add next, then my events, or the empty day. */
export function DayDetail({ date }: { date: DateKey }) {
  const router = useRouter();
  const uid = useAuth().session?.user.id;
  const doc = useCalendar(uid);
  const plan = usePlanState(uid);
  const plus = plan === 'plus' ? true : plan === 'free' ? false : null;
  const now = useNow(60_000);
  const rooms = doc ? dayRooms(doc.rooms, date) : [];
  const events = doc ? dayEvents(doc.events, date) : [];
  const empty = !!doc && rooms.length === 0 && events.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll} contentInsetAdjustmentBehavior="automatic">
      {rooms.map((r) => {
        const live = roomIsLive(r, now);
        const time = roomTime(r, undefined, now);
        const place = roomPlace(r);
        const card = <HeroCard hero={r.hero ?? 'general'} title={r.name} time={time} place={place} topic />;
        return (
          <View key={r.roomId} style={styles.group}>
            {live ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${[r.name, roomTimeSpoken(r, undefined, now), place].filter(Boolean).join(', ')}, open room`}
                onPress={() => router.push({ pathname: '/room/[id]', params: { id: r.roomId } })}
              >
                {card}
              </Pressable>
            ) : card}
            <RecapCard
              state={recapState(r, now, plus)}
              diary={r.diary}
              people={r.people}
              onSeePlus={() => router.push(plusIntroHref('diary'))}
            />
            {!live ? (
              <AddNext hero={r.hero} onPress={() => router.push({ pathname: '/calendar-event', params: addNextParams(r, r.emoji) })} />
            ) : null}
          </View>
        );
      })}
      {events.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`${e.title}, ${eventTimeText(e)}`}
          onPress={() => router.push({ pathname: '/calendar-event', params: { id: e.id } })}
          style={({ pressed }) => [styles.event, pressed && styles.pressed]}
        >
          <Text style={styles.emoji}>{e.emoji}</Text>
          <View style={styles.flex}>
            <Text style={styles.eventTitle} numberOfLines={2}>{e.title}</Text>
            <Text style={styles.eventTime}>{eventTimeText(e)}</Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={colors.ink2} />
        </Pressable>
      ))}
      {empty ? (
        <View style={styles.group}>
          <HeroCard hero="general" empty />
          <Text style={styles.emptyText}>{t.emptyDay(dayTitle(date))}</Text>
          <Button title={t.add} variant="secondary" onPress={() => router.push({ pathname: '/calendar-event', params: { date } })} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  group: { gap: 16 },
  flex: { flex: 1 },
  event: { minHeight: 64, borderRadius: 20, backgroundColor: '#F5EFE7', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  emoji: { fontSize: 24, lineHeight: 30 },
  eventTitle: { fontSize: 17, lineHeight: 22, fontFamily: 'SourceSans3-Semibold', color: '#2B2623' },
  eventTime: { fontSize: 15, lineHeight: 20, color: '#71645E' },
  emptyText: { fontSize: 17, lineHeight: 24, color: '#71645E', textAlign: 'center' },
});
