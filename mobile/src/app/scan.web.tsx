import { useRouter } from 'expo-router';

import { IosOnly } from '@/components/ios-only';

export default function ScanWeb() {
  const router = useRouter();
  return (
    <IosOnly
      sticker="connection-01"
      title="Scan with your phone"
      body="On the web, join with the room's 5-digit code."
      action={{ label: 'Enter code', onPress: () => router.push('/start/code') }}
    />
  );
}
