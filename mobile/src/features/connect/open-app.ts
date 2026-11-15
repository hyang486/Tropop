import { Alert, Linking } from 'react-native';

import { CONNECT_APP_STORE, type ConnectApp } from '@/lib/connect-plan';

import { connectCopy as t } from './copy';

/** spec §4: open the code's link (or the app's scheme); if nothing handles it, "LINE isn't on this phone." + Get LINE. */
export async function openOrOfferStore(app: ConnectApp, url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(t.notOnPhone(app), undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: t.getApp(app), onPress: () => void Linking.openURL(CONNECT_APP_STORE[app]) },
    ]);
  }
}
