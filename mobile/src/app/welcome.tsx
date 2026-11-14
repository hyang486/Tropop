import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HandTitle } from '@/components/hand-title';
import { InkArt } from '@/components/ink-art';
import { QLink, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { badLinkNoteShown } from '@/lib/invite';

// UX3-A03: one screen that sells the product: gathering art, "One room for today's crew", three value rows, then
// Join a room / Create a room / Log in. Before: Qrew Q 01.01 title, one line, gathering art. Join opens the code screen
// (item 10: code / QR → name → invite);
// Create goes to host login, which links to host sign-up ("New here? Create an account").
export default function Welcome() {
  const { notice, clearNotice } = useAuth();
  // UX2-42: a join link with a malformed token lands here with ?link=invalid.
  // UX2-60: an inline note under the subtitle says so; it clears on the next action.
  // C25: read from the current params, not once at mount; a Welcome already in the stack gets them via dismissTo.
  const { link, at } = useLocalSearchParams<{ link?: string; at?: string }>();
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const badLink = badLinkNoteShown({ link, at }, clearedAt);
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
      <View style={styles.art}>
        <InkArt art="gathering" width={300} />
      </View>
      <HandTitle style={styles.headline}>{en.welcome.headline}</HandTitle>
      {badLink ? (
        <View style={styles.note} accessibilityRole="alert">
          <SymbolView name="exclamationmark.circle" size={18} tintColor={colors.ink2} style={styles.noteIcon} />
          <Text style={styles.noteText}>{en.welcome.invalidLink}</Text>
        </View>
      ) : null}
      <View style={styles.values}>
        {VALUES.map((v) => (
          <View key={v.icon} style={styles.value} accessible>
            <View style={styles.valueIcon}>
              <SymbolView name={v.icon} size={18} tintColor={colors.label} />
            </View>
            <View style={styles.valueText}>
              <Text style={textRole.bodyStrong}>{v.title}</Text>
              <Text style={textRole.secondary}>{v.line}</Text>
            </View>
          </View>
        ))}
      </View>
    </QScreen>
  );
}

// UX3-A03 value rows: a 28 pt ink-outline icon box, a 17 pt semibold title and a 15 pt ink2 line, 14 pt apart.
const VALUES = [
  { icon: 'qrcode', title: en.welcome.valueJoinTitle, line: en.welcome.valueJoinLine },
  { icon: 'face.smiling', title: en.welcome.valuePhotosTitle, line: en.welcome.valuePhotosLine },
  { icon: 'hourglass', title: en.welcome.valueGoneTitle, line: en.welcome.valueGoneLine },
] as const;

const styles = StyleSheet.create({
  art: { alignItems: 'center', marginTop: 16 },
  headline: { fontSize: 36, lineHeight: 40, marginTop: 20 },
  values: { gap: 14 },
  value: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  valueIcon: {
    width: 28,
    height: 28,
    marginTop: 2,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: { flex: 1, gap: 2 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteIcon: { marginTop: 1 },
  noteText: { ...textRole.secondary, flex: 1 },
});
