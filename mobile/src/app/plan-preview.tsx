import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { HandTitle, useInk } from '@/components/hand-title';
import { InkArt } from '@/components/ink-art';
import { QCaption, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { setPlusPreview, usePlusPreview } from '@/features/calendar/calendar-store';
import { type PlusBenefit, plusBenefits, plusFrom } from '@/features/calendar/plus-intro';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

const t = en.planPreview;

// Black line icons (mockup: calendar, pencil, magnifier, people, clock).
const ICON: Record<PlusBenefit, SymbolViewProps['name']> = {
  diary: 'calendar',
  add: 'pencil',
  ai: 'plus.magnifyingglass',
  people: 'person.2',
  days: 'clock',
};

/**
 * Plus page (docs/evidence/plus-page-mockup; APP_CONCEPT_KO: plan and benefit demo only). Free: hero, reason card
 * by `?from=`, benefits (tapped one first), decided Free vs Plus values, Always free, and the sticky
 * "Try Plus preview" (set_my_plan, 0032). Plus: "You're on Plus", where to find each benefit, and a ghost
 * "Turn off Plus preview". No purchase, billing or StoreKit; prices are not shown.
 */
export default function PlanPreview() {
  const from = plusFrom(useLocalSearchParams<{ from?: string }>().from);
  const uid = useAuth().session?.user.id;
  const on = usePlusPreview(uid);
  const ink = useInk();
  const [saving, setSaving] = useState(false);
  const toggle = async (v: boolean) => {
    if (!uid || saving) return;
    setSaving(true);
    const ok = await setPlusPreview(uid, v);
    setSaving(false);
    if (!ok) Alert.alert(t.saveFailedTitle, t.saveFailedBody);
  };
  const isPlus = on === true;
  const actions = !uid ? undefined : isPlus ? (
    <>
      <Button variant="secondary" title={t.offCta} busy={saving} onPress={() => void toggle(false)} />
      <QCaption>{t.offFine}</QCaption>
    </>
  ) : (
    <>
      <Button title={t.tryCta} busy={saving} disabled={on === null} onPress={() => void toggle(true)} />
      <QCaption>{t.tryFine}</QCaption>
    </>
  );

  return (
    <QScreen actions={actions}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={[styles.pill, { borderColor: ink }]}>
              <Text style={[styles.pillText, { color: ink }]}>{t.pill}</Text>
            </View>
          ),
        }}
      />
      <View style={styles.hero}>
        <InkArt art={isPlus ? 'run' : 'gathering'} width={isPlus ? 170 : 220} />
        <HandTitle style={styles.center}>{isPlus ? t.onHeading : t.heading}</HandTitle>
        <Text style={[styles.sub, isPlus && styles.onBadge]}>{isPlus ? t.onBadge : t.sub}</Text>
      </View>

      {isPlus ? (
        <>
          <QLabel>{t.includedNow}</QLabel>
          {t.now.map((b, i) => (
            <Benefit key={b.key} icon={ICON[b.key as PlusBenefit]} title={b.title} body={b.body} divided={i > 0} />
          ))}
        </>
      ) : (
        <>
          {from ? (
            <View style={[styles.reason, { borderColor: ink }]} accessible>
              <View style={[styles.tag, { backgroundColor: ink }]}>
                <Text style={styles.tagText}>{t.reason[from].tag}</Text>
              </View>
              <Text style={styles.reasonText}>
                {t.reason[from].parts.map((part, i) =>
                  i % 2 ? (
                    <Text key={i} style={styles.bold}>
                      {part}
                    </Text>
                  ) : (
                    part
                  ),
                )}
              </Text>
            </View>
          ) : null}

          <QLabel>{t.whatYouGet}</QLabel>
          {plusBenefits(from).map(({ key }, i) => {
            const b = t.benefits[key];
            return <Benefit key={key} icon={ICON[key]} title={b.title} body={b.body} free={'free' in b ? b.free : undefined} divided={i > 0} />;
          })}

          <QLabel>{t.compareLabel}</QLabel>
          <View style={styles.compare}>
            <View style={styles.cmpRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.cmpLabel} />
              <Text style={[styles.cmpCell, styles.cmpHead]}>{t.free}</Text>
              <Text style={[styles.cmpCell, styles.cmpHead]}>{t.plus}</Text>
            </View>
            {t.compare.map((row) => {
              const say = (v: string | boolean | null) => (typeof v === 'string' ? v : v ? t.included : t.notIncluded);
              const show = (v: string | boolean | null) => (typeof v === 'string' ? v : v ? '✓' : '—');
              return (
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
              );
            })}
          </View>
          <Text style={styles.note}>{t.tbdNote}</Text>

          <QLabel>{t.alwaysFreeLabel}</QLabel>
          <Text style={styles.body}>
            <Text style={styles.bold}>{t.alwaysFree[0]}</Text>
            {t.alwaysFree[1]}
          </Text>
        </>
      )}
    </QScreen>
  );
}

function Benefit({
  icon,
  title,
  body,
  free,
  divided,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  body: string;
  free?: string;
  divided: boolean;
}) {
  const ink = useInk();
  return (
    <View style={[styles.benefit, divided && styles.dashed]} accessible accessibilityLabel={[title, body, free].filter(Boolean).join('. ')}>
      <View style={[styles.icon, { borderColor: ink }]}>
        <SymbolView name={icon} size={20} tintColor={ink} weight="light" />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitBody}>{body}</Text>
        {free ? <Text style={styles.free}>{free}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 },
  pillText: { fontSize: 15, fontWeight: '600' },
  hero: { alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
  sub: { fontSize: 16, color: colors.secondaryLabel, textAlign: 'center' },
  onBadge: { color: colors.label, fontWeight: '600' },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reasonText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.label },
  bold: { fontWeight: '700', color: colors.label },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.separator },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 17, fontWeight: '600', color: colors.label },
  benefitBody: { fontSize: 15, lineHeight: 20, color: colors.secondaryLabel },
  free: { fontSize: 13, color: colors.secondaryLabel, marginTop: 2 },
  compare: { borderRadius: 12, backgroundColor: colors.field, paddingHorizontal: 14 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  cmpDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  cmpLabel: { flex: 1.6, fontSize: 15, color: colors.label },
  cmpCell: { flex: 1, fontSize: 15, color: colors.secondaryLabel, textAlign: 'center' },
  cmpHead: { fontSize: 13, textTransform: 'uppercase' },
  note: { fontSize: 13, color: colors.secondaryLabel },
  body: { fontSize: 15, lineHeight: 21, color: colors.secondaryLabel },
});
