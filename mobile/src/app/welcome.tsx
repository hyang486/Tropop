import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { InkArt } from '@/components/ink-art';
import { QLink, QScreen } from '@/components/q-screen';
import { Button, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { Snackbar } from '@/features/event/snackbar';
import { useAuth } from '@/lib/auth';

// Qrew Q 01.01: title, one line, gathering art, then Join a room / Create a room. Join opens the code screen
// (item 10: code / QR → name → invite);
// Create goes to host login, which links to host sign-up ("New here? Create an account").
export default function Welcome() {
  const { notice, clearNotice } = useAuth();
  // UX2-42: a join link with a malformed token lands here with ?link=invalid.
  const { link } = useLocalSearchParams<{ link?: string }>();
  const [badLink, setBadLink] = useState(link === 'invalid');
  const hideBadLink = useCallback(() => setBadLink(false), []);
  function go(path: '/start/code' | '/sign-in') {
    clearNotice();
    router.push(path);
  }
  return (
    <QScreen
      title={en.appName}
      subtitle={en.welcome.tagline}
      bottom={<InkArt art="gathering" width={200} />}
      bottomAlign="center"
      floating={badLink ? <Snackbar notice={{ id: 1, text: en.welcome.invalidLink }} onHide={hideBadLink} /> : undefined}
      actions={
        <>
          {notice ? <Hint tone="error">{notice}</Hint> : null}
          <Button title={en.welcome.join} onPress={() => go('/start/code')} />
          <Button variant="secondary" title={en.welcome.create} onPress={() => go('/sign-in')} />
          <QLink title={en.welcome.haveAccount} onPress={() => go('/sign-in')} />
        </>
      }
    />
  );
}
