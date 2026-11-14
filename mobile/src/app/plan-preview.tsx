import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { QCaption, QCard, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, usePalette } from '@/components/ui';
import { setPlusPreview, usePlusPreview } from '@/features/calendar/calendar-store';
import { plusBenefits, plusFrom } from '@/features/calendar/plus-intro';
import { InkSwitch } from '@/features/event/ink-switch';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

/**
 * Plus intro (APP_CONCEPT_KO: plan and benefit demo only). `?from=calendar|room-ai|more|diary` (default more)
 * picks the headline and the benefit shown first. No purchase, billing or StoreKit is connected; the preview
 * switch saves the plan via set_my_plan (0032). Undecided prices and limits stay in one line under the actions.
 */
export default function PlanPreview() {
  const t = en.planPreview;
  const from = plusFrom(useLocalSearchParams<{ from?: string }>().from);
  const uid = useAuth().session?.user.id;
  const on = usePlusPreview(uid);
  const ink = usePalette().ink;
  const [saving, setSaving] = useState(false);
  const onToggle = async (v: boolean) => {
    if (!uid || saving) return;
    setSaving(true);
    const ok = await setPlusPreview(uid, v);
    setSaving(false);
    if (!ok) Alert.alert(t.saveFailedTitle, t.saveFailedBody);
  };
  return (
    <QScreen
      title={t.headline[from]}
      subtitle={t.sub[from]}
      actions={
        <>
          <Button title={t.cta} onPress={() => Alert.alert(t.ctaAlertTitle, t.ctaAlertBody)} />
          <QCaption>{t.tbdNote}</QCaption>
        </>
      }
    >
      <View style={[styles.badge, { borderColor: ink }]}>
        <Text style={[styles.badgeText, { color: ink }]}>{t.badge}</Text>
      </View>

      <QLabel>{t.benefitsLabel}</QLabel>
      <QCard>
        {plusBenefits(from).map(({ key, focus }, i) => {
          const b = t.benefits[key];
          return (
            <View
              key={key}
              accessible
              accessibilityLabel={focus ? `${b.title}, ${t.forYou}. ${b.body}` : `${b.title}. ${b.body}`}
              style={[styles.benefit, i > 0 && styles.divided, focus && styles.focus]}
            >
              <View style={[styles.mark, { borderColor: ink }, focus && { backgroundColor: ink }]} />
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, focus && styles.focusTitle]}>
                  {b.title}
                  {focus ? <Text style={styles.forYou}>{`  ${t.forYou}`}</Text> : null}
                </Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </View>
            </View>
          );
        })}
      </QCard>
      <Hint>{t.calendarFree}</Hint>

      {uid ? (
        <QCard row>
          <Text style={styles.previewLabel}>{t.tryPreview}</Text>
          <InkSwitch value={!!on} disabled={saving || on === null} onValueChange={(v) => void onToggle(v)} accessibilityLabel={t.tryPreview} />
        </QCard>
      ) : null}
      <Hint>{t.tryPreviewHint}</Hint>
      <Hint>{t.intro}</Hint>
    </QScreen>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  focus: { paddingVertical: 12 },
  mark: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginTop: 6 },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 16, color: colors.label },
  focusTitle: { fontWeight: '700' },
  forYou: { fontSize: 13, fontWeight: '600', color: colors.secondaryLabel },
  benefitBody: { fontSize: 14, color: colors.secondaryLabel },
  previewLabel: { flex: 1, fontSize: 16, color: colors.label },
});
