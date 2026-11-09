import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { QCard, QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import { errorMessage } from '@/lib/errors';
import { createRoom, ROOM_TYPES, type RoomType } from '@/lib/rooms';
import { defaultRoomHours, formatDeletedAt } from '@/lib/create-defaults';
import { useNow } from '@/lib/use-now';

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.tint }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.onTint }]}>{label}</Text>
    </Pressable>
  );
}

export default function CreateRoom() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('sports');
  // #11: the length follows the type's default until the host picks one by hand.
  const [pickedHours, setPickedHours] = useState<number | null>(null);
  const hours = pickedHours ?? defaultRoomHours(type);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [statuses, setStatuses] = useState<string>(en.createRoom.statusesDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #11: refreshed every 5 s and shown without seconds, so the time stays current while the screen is open.
  const now = useNow(5_000);
  const expiresPreview = new Date(now + hours * 3_600_000);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(en.createRoom.nameRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom({
        name: trimmed,
        type,
        expiresAt: new Date(Date.now() + hours * 3_600_000),
        locationAllowed,
        statuses: statuses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      router.replace({ pathname: '/room/[id]', params: { id: room.id } });
      router.push({ pathname: '/room/[id]/invite', params: { id: room.id } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  // Qrew Q 02.02 (human placement B): name, Room type chips, Room closes after chips (4 and 7 days as extra
  // chips, no Custom), the deletion line, the Plus preview link under it, the location card with its switch
  // and hint, the Status options card (editable), Create room pinned at the bottom. The optional meeting place
  // and time row comes with its own gated unit.
  return (
    <QScreen
      title={en.createRoom.title}
      actions={
        <>
          {error ? <Hint tone="error">{error}</Hint> : null}
          <Button title={en.createRoom.submit} onPress={submit} busy={busy} />
        </>
      }
    >
      <QField
        label={en.createRoom.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoFocus
        returnKeyType="done"
      />

      <QLabel>{en.createRoom.typeLabel}</QLabel>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.typeLabel}>
        {ROOM_TYPES.map((t) => (
          <Choice key={t} label={en.rooms.types[t]} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>

      <QLabel>{en.createRoom.expiryLabel}</QLabel>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.expiryLabel}>
        {en.createRoom.expiryOptions.map((o) => (
          <Choice key={o.hours} label={o.label} selected={hours === o.hours} onPress={() => setPickedHours(o.hours)} />
        ))}
      </View>
      <Text style={styles.deletes}>{en.createRoom.expiryHint(formatDeletedAt(expiresPreview.getTime()))}</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/plan-preview')} hitSlop={8}>
        <Text style={styles.planLink}>{en.planPreview.createRoomLink}</Text>
      </Pressable>

      <QCard row>
        <Text style={styles.cardTitle}>{en.createRoom.locationLabel}</Text>
        <Switch
          value={locationAllowed}
          onValueChange={setLocationAllowed}
          accessibilityLabel={en.createRoom.locationLabel}
        />
      </QCard>
      <Hint>{en.createRoom.locationHint}</Hint>

      <QCard>
        <Text style={styles.cardTitle}>{en.createRoom.statusesLabel}</Text>
        <TextInput
          value={statuses}
          onChangeText={setStatuses}
          accessibilityLabel={en.createRoom.statusesLabel}
          accessibilityHint={en.createRoom.statusesHint}
          style={styles.statuses}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
        />
        <Text style={styles.cardNote}>{en.createRoom.statusesHint}</Text>
      </QCard>
    </QScreen>
  );
}

const styles = StyleSheet.create({
  planLink: { fontSize: 15, color: colors.tint, textDecorationLine: 'underline' },
  deletes: { fontSize: 14, color: colors.label, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: { fontSize: 15, color: colors.label },
  cardTitle: { flex: 1, fontSize: 16, color: colors.label },
  statuses: { fontSize: 14, color: colors.secondaryLabel, paddingVertical: 2 },
  cardNote: { fontSize: 12, color: colors.secondaryLabel },
});
