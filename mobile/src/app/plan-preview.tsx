import { useFonts } from 'expo-font';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Modal } from '@/components/modal';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAND_FONTS, HandTitle, useInk } from '@/components/hand-title';
import { InkArt } from '@/components/ink-art';
import { QCaption, QScreen } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { setPlusPreview, usePlusPreview } from '@/features/calendar/calendar-store';
import { PLUS_LINES, type PlusLine, type PlusPreview, plusFrom, plusPitch } from '@/features/calendar/plus-intro';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { HAND_FONT_LATIN } from '@/lib/hand-font';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

const t = en.planPreview;
const s = t.sample;

// Black line icons (v2 mockup: magnifier, person+, pencil); UX2-64: shared by the Free and the Plus list.
const ICON: Record<PlusLine, SymbolViewProps['name']> = {
  ai: 'sparkles',
  rooms: 'person.badge.plus',
  add: 'pencil',
};

/**
 * Plus page v2 (docs/evidence/plus-page-mockup/v2.html; APP_CONCEPT_KO: plan and benefit demo only). One screen:
 * a feature preview and hand headline by `?from=`, three one-line benefits, one CTA "Try Plus free" (set_my_plan,
 * 0032), and "See what's included" opening the Free vs Plus sheet. Plus: "You're on Plus" and a ghost "Turn off".
 * No purchase, billing or StoreKit; no prices, no reviews.
 */
export default function PlanPreview() {
  const from = plusFrom(useLocalSearchParams<{ from?: string }>().from);
  const { preview, lines } = plusPitch(from);
  const router = useRouter();
  const uid = useAuth().session?.user.id;
  const on = usePlusPreview(uid);
  const ink = useInk();
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const toggle = async (v: boolean) => {
    if (!uid || saving) return;
    setSaving(true);
    const ok = await setPlusPreview(uid, v);
    setSaving(false);
    if (!ok) Alert.alert(t.saveFailedTitle, t.saveFailedBody);
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const isPlus = on === true;
  const actions = !uid ? undefined : isPlus ? (
    <>
      <Button variant="secondary" title={t.offCta} busy={saving} onPress={() => void toggle(false)} />
      <QCaption>{t.offFine}</QCaption>
    </>
  ) : (
    <>
      <Button title={t.tryCta} busy={saving} disabled={on === null} onPress={() => void toggle(true)} />
      {/* UX2-35: the link is its own Pressable so it gets a 44 pt target (a nested Text link can't). */}
      <View style={styles.fineRow}>
        <Text style={styles.fine}>{t.fine}</Text>
        <Pressable accessibilityRole="link" onPress={() => setSheet(true)} hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}>
          <Text style={[styles.fine, styles.link]}>{t.seeIncluded}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <QScreen actions={actions}>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t.close} hitSlop={8} style={styles.x}>
              <SymbolView name="xmark" size={16} tintColor={colors.label} weight="semibold" />
            </Pressable>
          ),
          headerTitle: () => (
            <View style={[styles.pill, { borderColor: ink }]}>
              <Text style={[styles.pillText, { color: ink }]}>{t.pill}</Text>
            </View>
          ),
        }}
      />
      {isPlus ? (
        <>
          <View style={styles.hero}>
            <InkArt art="fightOn" width={170} />
            <HandTitle style={styles.center}>{t.onHeading}</HandTitle>
            <Text style={[styles.sub, styles.onBadge]}>{t.onBadge}</Text>
          </View>
          <View style={styles.list}>
            {PLUS_LINES.map((k) => (
              <Line key={k} icon={ICON[k]} parts={t.lines[k]} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Preview kind={preview} />
          <View style={styles.hero}>
            <HandTitle style={styles.center}>{t.pitch[preview].heading}</HandTitle>
            <Text style={styles.sub}>{t.pitch[preview].sub}</Text>
          </View>
          <View style={styles.list}>
            {lines.map((k) => (
              <Line key={k} icon={ICON[k]} parts={t.lines[k]} />
            ))}
          </View>
        </>
      )}
      <IncludedSheet visible={sheet} onClose={() => setSheet(false)} />
    </QScreen>
  );
}

/** One benefit line; odd-index parts are bold. */
function Line({ icon, parts }: { icon: SymbolViewProps['name']; parts: readonly string[] }) {
  const ink = useInk();
  return (
    <View style={styles.line} accessible accessibilityLabel={parts.join('')}>
      <SymbolView name={icon} size={22} tintColor={ink} weight="light" style={styles.lineIcon} />
      <Text style={styles.lineText}>
        {parts.map((p, i) =>
          i % 2 ? (
            <Text key={i} style={styles.bold}>
              {p}
            </Text>
          ) : (
            p
          ),
        )}
      </Text>
    </View>
  );
}

/** The feature preview card: sample content showing what Plus does for this source. */
function Preview({ kind }: { kind: PlusPreview }) {
  const ink = useInk();
  const [loaded] = useFonts(HAND_FONTS);
  const hand = loaded ? { fontFamily: HAND_FONT_LATIN } : null;
  const label =
    kind === 'diary'
      ? [s.diaryTitle, s.diaryDate, ...s.diaryLines]
      : kind === 'chat'
        ? [s.ask, `${s.qrewing}: ${s.asked}`, `${s.qrewing}: ${s.answered}`]
        : [`${s.endsAfter} ${s.days[1]}`, `${s.people} ${s.peopleCount}`, `${s.tripName}, ${s.tripOpen}`];
  return (
    <View style={styles.preview} accessible accessibilityLabel={`${s.a11y}. ${label.join('. ')}`}>
      {kind === 'diary' ? (
        <View style={[styles.diary, { borderColor: ink }]}>
          <View style={styles.diaryHead}>
            <SymbolView name="cup.and.saucer" size={18} tintColor={ink} weight="light" />
            <Text style={[styles.diaryTitle, { color: ink }, hand]}>{s.diaryTitle}</Text>
          </View>
          <Text style={styles.diaryDate}>{s.diaryDate}</Text>
          {s.diaryLines.map((l) => (
            <Text key={l} style={[styles.diaryLine, { color: ink }, hand]}>
              {l}
            </Text>
          ))}
        </View>
      ) : kind === 'chat' ? (
        <View style={styles.chat}>
          <Text style={[styles.bubble, styles.me]}>{s.ask}</Text>
          {[s.asked, s.answered].map((b) => (
            <View key={b} style={[styles.bubble, styles.q, { borderColor: ink }]}>
              <Text style={[styles.who, { color: ink }, hand]}>{s.qrewing}</Text>
              <Text style={styles.bubbleText}>{b}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { borderColor: ink }]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{s.endsAfter}</Text>
            <View style={styles.chips}>
              {s.days.map((d, i) => (
                <Text key={d} style={[styles.chip, i === 1 && { backgroundColor: ink, color: colors.onTint }]}>
                  {d}
                </Text>
              ))}
            </View>
          </View>
          <View style={[styles.row, styles.rowDivided]}>
            <Text style={styles.rowLabel}>{s.people}</Text>
            <Text style={styles.bold}>{s.peopleCount}</Text>
          </View>
          <View style={[styles.row, styles.rowDivided]}>
            <Text style={styles.rowLabel}>{s.tripName}</Text>
            <Text style={styles.note}>{s.tripOpen}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** "See what's included": the Free vs Plus table, Always free, and the prices note, as a page sheet. */
function IncludedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  // UX2-46: closes at once when a link or notification tap navigates.
  const instant = useDismissOnLink(visible ? onClose : null);
  const say = (v: string | boolean | null) => (typeof v === 'string' ? v : v ? t.included : t.notIncluded);
  const show = (v: string | boolean | null) => (typeof v === 'string' ? v : v ? '✓' : '—');
  return (
    <Modal visible={visible} animationType={instant ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <HandTitle>{t.compareTitle}</HandTitle>
          <View style={styles.compare}>
            <View style={styles.cmpRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.cmpLabel} />
              <Text style={[styles.cmpCell, styles.cmpHead]}>{t.free}</Text>
              <Text style={[styles.cmpCell, styles.cmpHead]}>{t.plus}</Text>
            </View>
            {t.compare.map((row) => (
              <View
                key={row.label}
                style={[styles.cmpRow, styles.cmpDivided]}
                accessible
                accessibilityLabel={`${row.label}: ${t.free} ${say(row.free)}, ${t.plus} ${say(row.plus)}`}
              >
                <Text style={styles.cmpLabel}>{row.label}</Text>
                <Text style={styles.cmpCell}>{show(row.free)}</Text>
                <Text style={[styles.cmpCell, styles.bold]}>{show(row.plus)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>{t.tbdNote}</Text>
          <Text style={styles.body}>{t.alwaysFree}</Text>
        </ScrollView>
        <Button title={t.done} variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  x: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 },
  pillText: { fontSize: 15, fontWeight: '600' },
  preview: { height: 230, borderRadius: 20, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  diary: { width: 270, backgroundColor: colors.background, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, transform: [{ rotate: '-2deg' }] },
  diaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diaryTitle: { fontSize: 20 },
  diaryDate: { fontSize: 11, color: colors.ink2, marginTop: 2, marginBottom: 4 },
  diaryLine: { fontSize: 18, lineHeight: 26, borderBottomWidth: 1, borderBottomColor: colors.separator },
  chat: { width: 300, gap: 8 },
  bubble: { maxWidth: 230, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
  bubbleText: { fontSize: 13, lineHeight: 17, color: colors.label },
  me: { alignSelf: 'flex-end', backgroundColor: colors.fieldStrong, fontSize: 13, color: colors.label, overflow: 'hidden' },
  q: { alignSelf: 'flex-start', borderWidth: 1.5, backgroundColor: colors.background },
  who: { fontSize: 14 },
  card: { width: 310, backgroundColor: colors.background, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 8 },
  rowDivided: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.separator },
  rowLabel: { fontSize: 15, color: colors.label },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.field, color: colors.label },
  hero: { alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 20, color: colors.ink2, textAlign: 'center', marginHorizontal: 10 },
  onBadge: { color: colors.label, fontWeight: '600' },
  list: { gap: 12, marginHorizontal: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineIcon: { width: 24, height: 24 },
  lineText: { flex: 1, fontSize: 15.5, color: colors.label },
  bold: { fontWeight: '600', color: colors.label },
  fine: { fontSize: 12.5, color: colors.ink2, textAlign: 'center' },
  fineRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  link: { textDecorationLine: 'underline', color: colors.label },
  note: { fontSize: 13, color: colors.ink2 },
  sheet: { flex: 1, backgroundColor: colors.sheet, paddingHorizontal: 20, gap: 12 },
  sheetBody: { paddingTop: 28, gap: 16 },
  compare: { borderRadius: 12, backgroundColor: colors.sheetField, paddingHorizontal: 14 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  cmpDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  cmpLabel: { flex: 1.6, fontSize: 15, color: colors.label },
  cmpCell: { flex: 1, fontSize: 15, color: colors.ink2, textAlign: 'center' },
  cmpHead: { fontSize: 13, textTransform: 'uppercase' },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink2 },
});
