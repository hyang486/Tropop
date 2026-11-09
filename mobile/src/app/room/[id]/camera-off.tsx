import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { InkArt } from '@/components/ink-art';
import { QScreen } from '@/components/q-screen';
import { Button } from '@/components/ui';
import { en } from '@/i18n/en';
import { addToRoom } from '@/lib/add-media';
import { useAuth } from '@/lib/auth';
import { pickPhotosAndVideos } from '@/lib/media';
import { confirmOriginalsNotice } from '@/lib/originals-notice';

/**
 * Q 07.04 "Camera access is off": pushed from Photos & files when Take a photo finds camera access off (it was
 * an alert). Open Settings goes to the app's Settings page; Choose from library runs the gallery's photo picker
 * path (originals notice, size check, upload queue) and returns to the gallery once something is added.
 * Art: no camera drawing exists yet, so the group art (Q 01.04 gathering) stands in.
 */
export default function CameraOffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  async function chooseFromLibrary() {
    setBusy(true);
    try {
      if (!(await confirmOriginalsNotice())) return;
      const result = await addToRoom(id, session?.user.id, pickPhotosAndVideos);
      if (result === 'added' && router.canGoBack()) router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <QScreen
      title={en.cameraOff.title}
      subtitle={en.cameraOff.body}
      bottomAlign="center"
      bottom={<InkArt art="gathering" width={220} />}
      actions={
        <>
          <Button title={en.cameraOff.openSettings} onPress={() => Linking.openSettings()} />
          <Button title={en.cameraOff.chooseLibrary} variant="secondary" busy={busy} onPress={chooseFromLibrary} />
        </>
      }
    >
      <Stack.Screen options={{ title: en.cameraOff.title, headerTitle: '' }} />
    </QScreen>
  );
}
