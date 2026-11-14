import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InkArt } from '@/components/ink-art';
import { QLink, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { badLinkNoteShown } from '@/lib/invite';

// Qrew Q 01.01: title, one line, gathering art, then Join a room / Create a room. Join opens the code screen
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
      title={en.appName}
      subtitle={en.welcome.tagline}
      bottom={<InkArt art="gathering" width={200} />}
      bottomAlign="center"
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
        <View style={styles.note} accessibilityRole="alert">
          <SymbolView name="exclamationmark.circle" size={18} tintColor={colors.ink2} style={styles.noteIcon} />
          <Text style={styles.noteText}>{en.welcome.invalidLink}</Text>
        </View>
      ) : null}
    </QScreen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteIcon: { marginTop: 1 },
  noteText: { ...textRole.secondary, flex: 1 },
});
