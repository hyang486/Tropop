import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { InkArt } from '@/components/ink-art';
import { QLink, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAnnounce } from '@/features/event/announce';
import { useAuth } from '@/lib/auth';
import { badLinkNoteShown } from '@/lib/invite';

// UX3-A03: one screen that sells the product: gathering art, "One room for today's crew", three value rows, then
// Join a room / Create a room / Log in. Before: Qrew Q 01.01 title, one line, gathering art. Join opens the code screen
// (item 10: code / QR → name → invite);
// Create goes to Log in, which links to Create account (UX3-A07).
export default function Welcome() {
  const { notice, clearNotice } = useAuth();
  // UX2-42: a join link with a malformed token lands here with ?link=invalid.
  // UX2-60: an inline note under the subtitle says so; it clears on the next action.
  // C25: read from the current params, not once at mount; a Welcome already in the stack gets them via dismissTo.
  const { link, at } = useLocalSearchParams<{ link?: string; at?: string }>();
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const badLink = badLinkNoteShown({ link, at }, clearedAt);
  // sweep4 P1-3: VoiceOver reads the notice when it appears; `at` re-announces it for a second bad link.
  useAnnounce(badLink ? `${en.welcome.invalidLinkTitle} ${en.welcome.invalidLinkBody}` : null, badLink ? at : null);
  function go(path: '/start/code' | '/sign-in') {
    clearNotice();
    if (badLink) setClearedAt(at ?? '');
    router.push(path);
  }
  return (
    <QScreen
      actions={
        <>
          {notice ? <Hint tone="error">{notice}</Hint> : null}
          <Button title={en.welcome.join} onPress={() => go('/start/code')} />
          <Button variant="secondary" title={en.welcome.create} onPress={() => go('/sign-in')} />
          <QLink title={en.welcome.haveAccount} onPress={() => go('/sign-in')} />
        </>
      }
    >
      {badLink ? (
        <View
          style={styles.note}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`${en.welcome.invalidLinkTitle} ${en.welcome.invalidLinkBody}`}
        >
          <SymbolView name="exclamationmark.circle" size={22} tintColor={colors.label} style={styles.noteIcon} />
          <View style={styles.noteText}>
            <Text style={styles.noteTitle}>{en.welcome.invalidLinkTitle}</Text>
            <Text style={styles.noteBody}>{en.welcome.invalidLinkBody}</Text>
          </View>
        </View>
      ) : null}
      <Image source={require('@/assets/brand/logo/app-logo.png')} style={styles.logo} accessibilityIgnoresInvertColors accessible={false} />
      <View style={styles.art}>
        <InkArt art="gathering" aspect="16:9" />
      </View>
      <Text accessibilityRole="header" style={styles.headline}>{en.welcome.headline}</Text>
      <View style={styles.values}>
        {VALUES.map((v) => (
          <View key={v.icon} style={styles.value} accessible>
            <View style={styles.valueIcon}>
              <SymbolView name={v.icon} size={22} tintColor={colors.label} />
            </View>
            <View style={styles.valueText}>
              <Text style={styles.valueTitle}>{v.title}</Text>
              <Text style={textRole.secondary}>{v.line}</Text>
            </View>
          </View>
        ))}
      </View>
    </QScreen>
  );
}

// B2 value rows: an ink icon in a 40 pt softGold circle, a 16/24 600 title and a 14/20 ink2 line, 16 pt apart.
const VALUES = [
  { icon: 'qrcode', title: en.welcome.valueJoinTitle, line: en.welcome.valueJoinLine },
  { icon: 'face.smiling', title: en.welcome.valuePhotosTitle, line: en.welcome.valuePhotosLine },
  { icon: 'hourglass', title: en.welcome.valueGoneTitle, line: en.welcome.valueGoneLine },
] as const;

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 18, borderCurve: 'continuous', marginTop: 8, alignSelf: 'flex-start' },
  art: { marginTop: 16 },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.label, marginTop: 20 },
  values: { gap: 12, marginTop: 16 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  valueText: { flex: 1, gap: 2 },
  // sweep4 P1-3: a filled notice above the art (colors.field; becomes wash after V1).
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.field,
  },
  // expo-symbols aspect-fits an 18 pt medium-scale image (with padding) into the frame: a 22 pt frame draws a
  // ~17 pt circle. -1 centers it on the first 15 pt text line.
  noteIcon: { marginTop: -1 },
  noteText: { flex: 1, gap: 2 },
  noteTitle: { fontSize: 15, fontWeight: '600', color: colors.label },
  noteBody: { fontSize: 15, color: colors.ink2 },
});
