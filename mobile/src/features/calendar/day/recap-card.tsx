import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { Button, colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { metPeople, recapSpoken, type RecapState } from './day-detail-model';

const t = en.calendar;

/** Trok recap card (calendar-v2-spec §B2). Free never sees the diary text; unread plan shows nothing yet. */
export function RecapCard({
  state, diary, people, onSeePlus,
}: { state: RecapState; diary?: string[] | null; people?: number | null; onSeePlus: () => void }) {
  if (state === 'wait') return null;
  const met = state === 'ready' ? metPeople(people) : null;
  const spoken = recapSpoken(state, people, diary);
  return (
    <View style={styles.outer} accessible={spoken ? true : undefined} accessibilityLabel={spoken ?? undefined}>
      <View style={styles.header} accessible={spoken ? undefined : true} accessibilityRole="header" accessibilityLabel={spoken ? undefined : t.recapTitle}>
        <SymbolView name="sparkles" size={18} tintColor={colors.tint} />
        <Text style={styles.headerText}>{t.recapTitle}</Text>
      </View>
      <View style={styles.inner}>
        {state === 'pending' ? <Text style={styles.line}>{t.recapPending}</Text> : null}
        {state === 'failed' ? <Text style={styles.line}>{t.recapNone}</Text> : null}
        {state === 'upsell' ? (
          <View style={styles.upsell}>
            <Text style={styles.rowTitle}>{t.upsellCardTitle}</Text>
            <Text style={styles.line}>{t.upsellCardBody}</Text>
            <Button title={t.upsellSeePlus} onPress={onSeePlus} />
          </View>
        ) : null}
        {met ? (
          <View style={styles.row} accessible={spoken ? undefined : true} accessibilityLabel={spoken ? undefined : met}>
            <SymbolView name="person.2" size={22} tintColor={colors.tint} />
            <Text style={styles.rowTitle}>{met}</Text>
          </View>
        ) : null}
        {met && state === 'ready' ? <View style={styles.hairline} /> : null}
        {state === 'ready' ? (
          <View style={styles.row}>
            <SymbolView name="doc.text" size={22} tintColor={colors.tint} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{t.takeaways}</Text>
              {(diary ?? []).slice(0, 3).map((l, i) => (
                <Text key={i} style={styles.diary}>{l}</Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: '#FFF2BF', borderRadius: 24, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, paddingHorizontal: 8, paddingBottom: 12 },
  headerText: { fontSize: 17, lineHeight: 22, fontFamily: 'SourceSans3-Semibold', color: colors.tint },
  inner: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 4 },
  upsell: { gap: 8 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6DED7' },
  rowTitle: { fontSize: 16, lineHeight: 24, fontFamily: 'SourceSans3-Semibold', color: '#2B2623' },
  line: { fontSize: 15, lineHeight: 22, color: '#71645E' },
  diary: { fontSize: 15, lineHeight: 22, color: '#71645E' },
});
