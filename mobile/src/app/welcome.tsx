import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';

export default function Welcome() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.title}>{en.appName}</Text>
        <Text style={styles.tagline}>{en.welcome.tagline}</Text>
      </View>
      <View style={styles.actions}>
        <Button title={en.welcome.joinAsGuest} onPress={() => router.push('/guest')} />
        <Hint>{en.welcome.guestHint}</Hint>
        <View style={styles.spacer} />
        <Button variant="secondary" title={en.welcome.hostSignIn} onPress={() => router.push('/sign-in')} />
        <Button variant="secondary" title={en.welcome.hostSignUp} onPress={() => router.push('/sign-up')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'space-between' },
  hero: { marginTop: 80, gap: 12 },
  title: { fontSize: 44, fontWeight: '800', color: colors.label },
  tagline: { fontSize: 20, color: colors.secondaryLabel },
  actions: { gap: 12 },
  spacer: { height: 8 },
});
