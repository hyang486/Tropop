import { useState } from 'react';

import { Button, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

/** UX2-42 (pattern E): the profile read failed; red cause line + "Try again", busy until the read answers. */
export function ProfileRetry() {
  const { profileFailed, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!profileFailed) return null;
  return (
    <>
      <Hint tone="error">{en.profile.loadFailed}</Hint>
      <Button
        title={en.errors.tryAgain}
        variant="secondary"
        busy={busy}
        onPress={() => {
          setBusy(true);
          void refreshProfile().finally(() => setBusy(false));
        }}
      />
    </>
  );
}
