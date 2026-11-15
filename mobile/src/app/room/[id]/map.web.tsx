import { useLocalSearchParams, useRouter } from 'expo-router';

import { IosOnly } from '@/components/ios-only';

export default function MapWeb() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <IosOnly
      sticker="meetup-04"
      title="Live map is on the phone"
      body="Location sharing uses your phone's GPS. Open this room in the Tropop app to see who's nearby."
      action={{ label: 'Back to chat', onPress: () => router.canGoBack() ? router.back() : router.replace(`/room/${id}`) }}
    />
  );
}
