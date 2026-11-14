import { DatePicker, Host } from '@expo/ui/swift-ui';
import { dynamicTypeSize, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, PlatformColor, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { InkIcon } from '@/components/calendar';
import { PlacePinMap } from '@/components/place-time-cards';
import { usePlanState } from '@/features/calendar/calendar-store';
import { defaultDraft, type QuestionPayload, validateQuestions } from '@/features/event/entry-questions';
import { useAnnounce } from '@/features/event/announce';
import { capacityClampNote } from '@/lib/capacity-clamp-plan';
import { createBarLayout } from '@/features/event/create-bar';
import {
  defaultEndHours,
  endError,
  endMs,
  endRange,
  type EndChoice,
  MORE_PRESETS,
  aiEnabledValue,
  aiSwitchAction,
  moreAction,
  QUICK_PRESETS,
  FREE_MAX_HOURS,
  selectedPreset,
} from '@/features/event/create-room-plan';
import { InkSwitch } from '@/features/event/ink-switch';
import {
  type Capacity,
  capacityEnds,
  capacityMax,
  capacityPlusTap,
  defaultRoomIcon,
  isPlanLimit,
  MAX_AREA,
  OPEN_ROOMS_LIVE,
  openRoomProblem,
  ROOM_ICONS,
  stepCapacity,
  capacityValue,
  typedCapacity,
  type Visibility,
} from '@/features/event/open-room-plan';
import { createOpenAwareRoom } from '@/features/event/open-rooms-api';
import { QuestionEditor, questionProblemText } from '@/features/event/question-editor';
import { setEntryQuestions, setQrewingRoom } from '@/features/event/qrewing-api';
import { QField, QLabel, QLink, QScreen } from '@/components/q-screen';
import { useAuth } from '@/lib/auth';
import { Button, colors, Hint, radius, size, textRole } from '@/components/ui';
import { StatusChips } from '@/features/event/status-chips';
import { en } from '@/i18n/en';
import { errorMessage } from '@/lib/errors';
import { createRoom, ROOM_TYPES, type RoomType } from '@/lib/rooms';
import {
  clampStart,
  MAX_PLACE_NAME,
  normalizePlaceName,
  pinAfterNameChange,
  pinAreaLabel,
  startTimeError,
  startTimeRange,
  type LatLng,
} from '@/lib/place-time';
import { useNow } from '@/lib/use-now';

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      // UX2-35: the 38 pt chip keeps its look; 4 pt above and below make a 44 pt target (rows are 8 pt apart).
      hitSlop={{ top: 4, bottom: 4 }}
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
  const uid = useAuth().session?.user.id;
  // C14: Free is never guessed; loading and offline are both null (gates do nothing), and a gated tap while
  // offline says why under that control.
  const plan = usePlanState(uid);
  const plus = plan === 'plus' ? true : plan === 'free' ? false : null;
  const [offlineTap, setOfflineTap] = useState<'ai' | 'more' | null>(null);
  // #11 / Spec 11 A7: End follows the type's default until the host picks a preset or a time by hand.
  const [pickedEnd, setPickedEnd] = useState<EndChoice | null>(null);
  const choice: EndChoice = pickedEnd ?? { kind: 'preset', hours: defaultEndHours(type, plus) };
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [statuses, setStatuses] = useState<string[]>([...en.createRoom.statusesDefault]);
  // Qrewing AI (spec 3.2, D2 2026-11-14): on by default for Plus hosts, off for Free and while the plan loads. The
  // default is applied once the plan first resolves and only until the host touches the switch. Entry info is offered
  // for event rooms only.
  const [pickedAi, setPickedAi] = useState<boolean | null>(null);
  const [firstPlus, setFirstPlus] = useState<boolean | null>(null);
  if (firstPlus === null && plus !== null) setFirstPlus(plus);
  const aiEnabled = aiEnabledValue(pickedAi, firstPlus);
  const [entryRequired, setEntryRequired] = useState(false);
  // Spec 9.4: the host's entry questions, prefilled with the default four.
  const [questions, setQuestions] = useState(defaultDraft);
  const [questionProblem, setQuestionProblem] = useState<ReturnType<typeof validateQuestions> | null>(null);
  // Spec 11 B/D: capacity (unchanged = the plan maximum) and who can join. A public room needs an icon (follows the
  // type until picked) and an area for Open chat.
  const [capacity, setCapacity] = useState<Capacity>('none');
  // 2 … plan max with no "No limit": + is off at the max and − at 2 (dimmed, or they look tappable).
  const { atMin, atMax } = capacityEnds(capacity, plus);
  // Capacity option B: a Free host's + at 6 opens the Plus page (not dimmed); a Plus host's + at 30 is off.
  const plusTap = capacityPlusTap(capacity, plus);
  // qa: 27 taps to 3. Holding +/− repeats, and the number is an inline field (UX P1-10, was an alert),
  // clamped to 2 … plan max on done. While typing it holds the raw text; a non-number reverts.
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  function stopRepeat() {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  }
  function startRepeat(delta: 1 | -1) {
    stopRepeat();
    setClampNote(null);
    repeat.current = setInterval(() => setCapacity((c) => stepCapacity(c, delta, plus)), 120);
  }
  useEffect(() => stopRepeat, []);
  // UX2-131: a typed count above the plan max is clamped and says so under the stepper (Done never opens Plus).
  // VoiceOver reads it each time it is set; the next stepper change clears it.
  const [clampNote, setClampNote] = useState<ReturnType<typeof capacityClampNote>>(null);
  const [clampSeq, setClampSeq] = useState(0);
  useAnnounce(clampNote?.text, clampSeq);
  function stepTo(delta: 1 | -1) {
    setClampNote(null);
    setCapacity(stepCapacity(capacity, delta, plus));
  }
  const [capacityDraft, setCapacityDraft] = useState<string | null>(null);
  function commitCapacity() {
    if (capacityDraft === null) return;
    const n = typedCapacity(capacityDraft, plus);
    if (n !== null) setCapacity(n);
    setClampNote(capacityClampNote(capacityDraft, plus, capacityMax(plus), en.createRoom));
    setClampSeq((s) => s + 1);
    setCapacityDraft(null);
  }
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const icon = pickedIcon ?? defaultRoomIcon(type);
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // iOS VoiceOver ignores Hint's live region: each failure bumps the counter so a repeated identical error is read
  // again. Question problems skip it (QuestionEditor announces those), so one Create never speaks twice.
  const [failures, setFailures] = useState(0);
  useAnnounce(error, failures);
  function fail(message: string) {
    setError(message);
    setFailures((n) => n + 1);
  }
  // Place and time (0026), all optional: a place name, a pin found from the name (tap the map to move it) and a
  // start time. A pin is kept only while there is a place name (create_room rule).
  const [placeName, setPlaceName] = useState('');
  // V1: the area and meeting place rows are text fields: a 1.5 pt ink border only while focused.
  const [focusedRow, setFocusedRow] = useState<'area' | 'place' | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [finding, setFinding] = useState(false);
  const [placeNote, setPlaceNote] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [startNote, setStartNote] = useState<string | null>(null);
  // UX2-24: End was snapped back to 2 days because the plan is Free now.
  const [endSnapped, setEndSnapped] = useState(false);
  // qa 5: where the pin is ("Los Angeles, CA"), so a first geocoder hit in the wrong city is easy to spot.
  // Kept with the pin it was looked up for, so a moved or dropped pin never shows an old area.
  const [pinLookup, setPinLookup] = useState<{ pin: LatLng; area: string | null } | null>(null);
  const pinArea = pin && pinLookup?.pin === pin ? pinLookup.area : null;
  // The picker's range starts when the screen opens, so a chosen start never falls below it as time passes
  // (the picker would then show a clamped time that differs from what is sent).
  const [openedAt] = useState(() => Date.now());

  // #11: refreshed every 5 s and shown without seconds, so the time stays current while the screen is open.
  const now = useNow(5_000);
  const endAt = endMs(choice, now);
  const startRange = { ...startTimeRange(endAt, now), start: new Date(openedAt) };
  const hasPlace = normalizePlaceName(placeName) !== null;

  // qa 3: a new End moves a start time that no longer fits, and says so, so what the picker shows is what is sent.
  function changeEnd(nextEnd: number) {
    const range = { ...startTimeRange(nextEnd, now), start: new Date(openedAt) };
    const { startsAt: clamped, moved } = clampStart(startsAt, range);
    setStartsAt(clamped);
    setStartNote(moved ? en.createRoom.startMoved : null);
  }

  function pickType(t: RoomType) {
    setType(t);
    if (pickedEnd === null) changeEnd(now + defaultEndHours(t, plus) * 3_600_000);
  }

  function pickPreset(h: number) {
    setEndSnapped(false);
    setPickedEnd({ kind: 'preset', hours: h });
    changeEnd(now + h * 3_600_000);
  }

  function pickEndAt(d: Date) {
    setPickedEnd({ kind: 'at', ms: d.getTime() });
    changeEnd(d.getTime());
  }

  // Free hosts: turning Qrewing AI on opens the Plus screen instead of toggling (human, via qa 2026-11-13).
  function changeAi(next: boolean) {
    const action = aiSwitchAction(plus, next);
    setOfflineTap(action === null && plan === 'offline' ? 'ai' : null);
    if (action === 'toggle') setPickedAi(next);
    if (action === 'upgrade') router.push({ pathname: '/plan-preview', params: { from: 'room-ai' } });
  }

  // A5: "More" opens 3–7 days on Plus and the Plus screen on Free; nothing while the Plus flag loads.
  function openMore() {
    const action = moreAction(plus);
    setOfflineTap(action === null && plan === 'offline' ? 'more' : null);
    if (action === 'upgrade') router.push({ pathname: '/plan-preview', params: { from: 'more' } });
    if (action !== 'choices') return;
    const labels = MORE_PRESETS.map((h) => en.createRoom.presetLabel(h));
    ActionSheetIOS.showActionSheetWithOptions(
      { title: en.createRoom.moreTitle, options: [...labels, en.createRoom.cancel], cancelButtonIndex: labels.length },
      (i) => {
        if (i < labels.length) pickPreset(MORE_PRESETS[i]);
      },
    );
  }

  // qa 4: any edit of the name drops the pin, so Find on map shows again for the new name.
  function changePlaceName(text: string) {
    setPin((current) => pinAfterNameChange(current, placeName, text));
    setPlaceName(text);
    setPlaceNote(null);
  }

  useEffect(() => {
    if (!pin) return;
    let live = true;
    // Apple reverse geocoding (no location permission). On failure nothing is shown.
    Location.reverseGeocodeAsync(pin)
      .then(([address]) => live && setPinLookup({ pin, area: pinAreaLabel(address) }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pin]);

  async function findOnMap() {
    const query = normalizePlaceName(placeName);
    if (!query) return;
    setFinding(true);
    setPlaceNote(null);
    try {
      // iOS geocodes with Apple (CLGeocoder); no location permission needed.
      const [hit] = await Location.geocodeAsync(query);
      if (hit) setPin({ latitude: hit.latitude, longitude: hit.longitude });
      else setPlaceNote(en.createRoom.notFound);
    } catch {
      setPlaceNote(en.createRoom.findFailed);
    } finally {
      setFinding(false);
    }
  }

  function addStartTime() {
    // Default: the next full hour, kept inside the picker's range.
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    setStartsAt(clampStart(next, startRange).startsAt);
    setStartNote(null);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      fail(en.createRoom.nameRequired);
      return;
    }
    const expiresAt = new Date(endMs(choice, Date.now()));
    const endProblem = endError(expiresAt.getTime(), Date.now(), plus);
    if (endProblem === 'tooLong' && plus === false) {
      // UX2-24 (pattern G, as PT402): not an error. Snap End back to 2 days and say why, with See Plus.
      pickPreset(FREE_MAX_HOURS);
      setEndSnapped(true);
      setError(null);
      return;
    }
    // Plan still unknown: a long End goes to the server, which answers PT402 (the Plus page) if it is too long.
    if (endProblem && !(endProblem === 'tooLong' && plus === null)) {
      fail(endProblem === 'tooSoon' ? en.createRoom.endTooSoon : en.createRoom.endTooLong(!!plus));
      return;
    }
    const startProblem = startTimeError(startsAt, expiresAt.getTime(), Date.now());
    if (startProblem) {
      fail(startProblem === 'afterClose' ? en.createRoom.startAfterClose : en.createRoom.startTooEarly);
      return;
    }
    const askEntry = aiEnabled && type === 'event' && entryRequired;
    let payload: QuestionPayload[] = [];
    if (askEntry) {
      const checked = validateQuestions(questions);
      if ('problem' in checked) {
        setQuestionProblem(checked);
        const n = questions.findIndex((q) => q.key === checked.key) + 1;
        setError(questionProblemText(checked.problem, n || null));
        return;
      }
      payload = checked.value;
    }
    if (OPEN_ROOMS_LIVE && openRoomProblem(visibility, area)) {
      fail(en.createRoom.areaMissing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = {
        name: trimmed,
        type,
        expiresAt,
        locationAllowed,
        placeName,
        pin,
        startsAt,
        statuses,
      };
      const room = OPEN_ROOMS_LIVE
        ? await createOpenAwareRoom({ ...input, capacity, plus, visibility, icon, area })
        : await createRoom(input);
      // A failed Qrewing save never blocks the room; the chat screen shows the note once.
      let aiNote: string | undefined;
      let questionsNote: string | undefined;
      if (aiEnabled) {
        // Spec 9.2 order: questions first, since entry_required needs at least one. If they fail, entry stays off.
        let entry = askEntry;
        if (entry) {
          const saved = await setEntryQuestions(room.id, payload);
          if ('error' in saved) {
            entry = false;
            questionsNote = saved.error === 'locked' ? en.qrewing.create.questionsLocked : en.qrewing.create.questionsSaveFailed;
          }
        }
        const res = await setQrewingRoom(room.id, true, entry);
        if (res.error) aiNote = '1';
      }
      router.replace({ pathname: '/room/[id]', params: aiNote ? { id: room.id, aiNote } : { id: room.id } });
      router.push({ pathname: '/room/[id]/invite', params: { id: room.id } });
      if (questionsNote) Alert.alert(questionsNote);
    } catch (e) {
      setBusy(false);
      // 0032 PT402: the Free plan's 6 people / 2 days; the same Plus screen as "More" on Free.
      if (isPlanLimit(e)) return router.push({ pathname: '/plan-preview', params: { from: 'more' } });
      fail(errorMessage(e));
    }
  }

  // Qrew Q 02.02 + Spec 11 (human review 2026-11-13): name, Room type, the location and Qrewing AI rows (outlined, ink
  // switches, one-line AI hint; UI audit item 8 keeps them right under Room type), then a Luma-style place row and
  // Start ⋮ End block with one line of End presets (A5, A7), then Status options. The Plus preview link is gone (A6).
  const preset = selectedPreset(choice);
  return (
    <QScreen
      title={en.createRoom.title}
      actions={
        // E2E (i): hairline at the scroll edge and a non-tappable gap, so a tap on a clipped switch never hits Create.
        <View style={styles.bar}>
          {error ? <Hint tone="error">{error}</Hint> : null}
          <Button title={en.createRoom.submit} onPress={submit} busy={busy} />
        </View>
      }
    >
      <QField
        label={en.createRoom.nameLabel}
        labelAbove
        placeholder={en.createRoom.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoFocus
        returnKeyType="done"
      />

      <QLabel>{en.createRoom.typeLabel}</QLabel>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.typeLabel}>
        {ROOM_TYPES.map((t) => (
          <Choice key={t} label={en.rooms.types[t]} selected={type === t} onPress={() => pickType(t)} />
        ))}
      </View>

      {OPEN_ROOMS_LIVE ? (
        <>
          {/* Spec 11 B / UX P1-10: People stepper, 2 … plan max (the server caps at 30); the number is typed inline. */}
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{en.createRoom.capacityLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.createRoom.fewerPeople}
              disabled={atMin}
              accessibilityState={{ disabled: atMin }}
              style={[styles.step, atMin && styles.stepOff]}
              onPress={() => stepTo(-1)}
              onLongPress={() => startRepeat(-1)}
              delayLongPress={300}
              onPressOut={stopRepeat}
              hitSlop={8}
            >
              <SymbolView name="minus.circle" size={26} tintColor={colors.label} />
            </Pressable>
            <TextInput
              selectionColor={colors.label}
              style={styles.capacity}
              value={capacityDraft ?? String(capacityValue(capacity, plus))}
              onChangeText={setCapacityDraft}
              onFocus={() => setCapacityDraft(String(capacityValue(capacity, plus)))}
              onBlur={commitCapacity}
              onSubmitEditing={commitCapacity}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={2}
              selectTextOnFocus
              accessibilityLabel={en.createRoom.capacityLabel}
              accessibilityHint={capacityHint(plus)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.createRoom.morePeople}
              disabled={plusTap === 'off'}
              accessibilityState={{ disabled: plusTap === 'off' }}
              accessibilityHint={plusTap === 'upgrade' ? capacityHint(plus) : undefined}
              style={[styles.step, plusTap === 'off' && styles.stepOff]}
              onPress={() =>
                plusTap === 'upgrade'
                  ? router.push({ pathname: '/plan-preview', params: { from: 'capacity' } })
                  : stepTo(1)
              }
              onLongPress={() => (plusTap === 'step' ? startRepeat(1) : undefined)}
              delayLongPress={300}
              onPressOut={stopRepeat}
              hitSlop={8}
            >
              <SymbolView name="plus.circle" size={26} tintColor={colors.label} />
            </Pressable>
          </View>
          {/* UX2-131 (ux): one slot under the stepper: the clamp line while it is set, else the Free at-max line.
              UX2-54: Plus at 30 shows only the hint ("Plus rooms hold up to 30."), no at-max line. */}
          {clampNote ? (
            <View style={styles.clampRow}>
              <Text style={styles.clampNote}>{clampNote.text} </Text>
              {clampNote.link ? (
                <Pressable
                  accessibilityRole="link"
                  // UX2-131b: 18 pt line + 13 + 13 slop = 44 pt hit; the row stays one text line tall (no jump vs at-max).
                  hitSlop={{ top: 13, bottom: 13 }}
                  onPress={() => router.push({ pathname: '/plan-preview', params: { from: 'capacity' } })}
                  style={({ pressed }) => pressed && { opacity: 0.5 }}
                >
                  <Text style={[styles.clampNote, styles.clampLinkText]}>{en.createRoom.seePlus}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : atMax && plus === false ? (
            <Text style={styles.atMax}>{en.createRoom.capacityAtMax(capacityMax(false), false)}</Text>
          ) : null}
          <Hint>{capacityHint(plus)}</Hint>

          {/* Spec 11 D: Private (code or QR) or Public (listed in Open chat, joins without a code). */}
          <QLabel>{en.createRoom.visibilityLabel}</QLabel>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.visibilityLabel}>
            {(['private', 'public'] as const).map((v) => (
              <Choice key={v} label={en.createRoom[v]} selected={visibility === v} onPress={() => setVisibility(v)} />
            ))}
          </View>
          <Hint>{visibility === 'public' ? en.createRoom.publicHint : en.createRoom.privateHint}</Hint>
          {visibility === 'public' ? (
            <>
              <QLabel>{en.createRoom.iconLabel}</QLabel>
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.iconLabel}>
                {ROOM_ICONS.map((i) => (
                  <Pressable
                    key={i.key}
                    accessibilityRole="radio"
                    accessibilityLabel={en.createRoom.iconNames[i.key] ?? en.createRoom.iconLabel}
                    accessibilityState={{ selected: icon === i.key }}
                    onPress={() => setPickedIcon(i.key)}
                    style={[styles.iconChip, icon === i.key && styles.iconChipOn]}
                  >
                    <InkIcon emoji={i.emoji} size={24} />
                  </Pressable>
                ))}
              </View>
              <View style={[styles.fieldRow, focusedRow === 'area' && styles.fieldRowFocused]}>
                <TextInput
                  selectionColor={colors.label}
                  onFocus={() => setFocusedRow('area')}
                  onBlur={() => setFocusedRow(null)}
                  placeholder={en.createRoom.areaPlaceholder}
                  placeholderTextColor={colors.secondaryLabel}
                  accessibilityLabel={en.createRoom.areaPlaceholder}
                  value={area}
                  onChangeText={setArea}
                  maxLength={MAX_AREA}
                  returnKeyType="done"
                  style={styles.rowInput}
                />
                {pinArea && !area.trim() ? (
                  <Pressable accessibilityRole="button" onPress={() => setArea(pinArea)} hitSlop={8}>
                    <Text style={styles.rowAction}>{en.createRoom.areaUsePin(pinArea)}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.cardTitle}>{en.createRoom.locationLabel}</Text>
        <InkSwitch value={locationAllowed} onValueChange={setLocationAllowed} accessibilityLabel={en.createRoom.locationLabel} />
      </View>
      <Hint>{en.createRoom.locationHint}</Hint>

      <View style={styles.row}>
        <Text style={styles.cardTitle}>{en.qrewing.create.aiLabel}</Text>
        <InkSwitch value={aiEnabled} onValueChange={changeAi} accessibilityLabel={en.qrewing.create.aiLabel} />
      </View>
      <Hint>{en.qrewing.create.aiHint}</Hint>
      {offlineTap === 'ai' ? <Hint>{en.planPreview.offline}</Hint> : null}
      {aiEnabled && type === 'event' ? (
        <>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{en.qrewing.create.entryLabel}</Text>
            <InkSwitch
              value={entryRequired}
              onValueChange={setEntryRequired}
              accessibilityLabel={en.qrewing.create.entryLabel}
            />
          </View>
          <Hint>{en.qrewing.create.entryHint}</Hint>
          {entryRequired ? (
            <QuestionEditor
              value={questions}
              onChange={(next) => {
                setQuestions(next);
                setQuestionProblem(null);
              }}
              problem={questionProblem && 'problem' in questionProblem ? questionProblem : null}
            />
          ) : null}
        </>
      ) : null}

      <QLabel>{en.createRoom.whenLabel}</QLabel>
      {/* A7: one place row (pin icon, name, Find on map at the end), Luma style. */}
      <View style={[styles.fieldRow, focusedRow === 'place' && styles.fieldRowFocused]}>
        <InkIcon emoji="📍" size={22} />
        <TextInput
          selectionColor={colors.label}
          onFocus={() => setFocusedRow('place')}
          onBlur={() => setFocusedRow(null)}
          placeholder={en.createRoom.placeLabel}
          placeholderTextColor={colors.secondaryLabel}
          accessibilityLabel={en.createRoom.placeLabel}
          accessibilityHint={en.createRoom.placePlaceholder}
          value={placeName}
          onChangeText={changePlaceName}
          maxLength={MAX_PLACE_NAME}
          returnKeyType="search"
          onSubmitEditing={findOnMap}
          style={styles.rowInput}
        />
        {hasPlace && !pin ? (
          <Pressable accessibilityRole="button" onPress={findOnMap} disabled={finding} hitSlop={8}>
            <Text style={styles.rowAction}>{finding ? en.createRoom.finding : en.createRoom.findOnMap}</Text>
          </Pressable>
        ) : null}
      </View>
      {placeNote ? <Hint>{placeNote}</Hint> : null}
      {hasPlace && pin ? (
        <>
          <PlacePinMap pin={pin} title={normalizePlaceName(placeName) ?? undefined} onMapClick={setPin} />
          {pinArea ? <Text style={styles.pinArea}>{pinArea}</Text> : null}
          <Text style={styles.cardNote}>{en.createRoom.pinHint}</Text>
          <QLink title={en.createRoom.removePin} onPress={() => setPin(null)} />
        </>
      ) : null}

      {/* A7: Start ⋮ End, two dots joined by a dotted line. End is when the room closes and is deleted. Date and
          time pickers wrap onto a second line when they do not fit; their Dynamic Type is capped at xxxLarge. */}
      <View style={styles.when}>
        <View style={styles.whenRow}>
          <View style={[styles.dot, styles.dotStart]} />
          <Text style={styles.whenLabel} maxFontSizeMultiplier={1.5}>
            {en.createRoom.startTimeLabel}
          </Text>
          {startsAt ? (
            <View style={styles.pickers}>
            {(['date', 'hourAndMinute'] as const).map((part) => (
              <Host key={part} matchContents>
                <DatePicker
                  title={en.createRoom.startTimeLabel}
                  selection={startsAt}
                  range={startRange}
                  displayedComponents={[part]}
                  onDateChange={(d) => {
                    setStartsAt(d);
                    setStartNote(null);
                  }}
                  modifiers={[labelsHidden(), dynamicTypeSize({ max: 'xxxLarge' })]}
                />
              </Host>
            ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={en.createRoom.removeStartTime}
                onPress={() => {
                  setStartsAt(null);
                  setStartNote(null);
                }}
                hitSlop={10}
              >
                <SymbolView name="xmark.circle" size={20} tintColor={colors.secondaryLabel} />
              </Pressable>
            </View>
          ) : (
            // UX2-73: unset, Start is a pill like End's pickers reading "Now"; a tap sets a time and shows the pickers.
            <View style={styles.pickers}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={en.createRoom.addStartTime}
                accessibilityValue={{ text: en.createRoom.startNow }}
                onPress={addStartTime}
                style={({ pressed }) => [styles.timePill, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.timePillText} maxFontSizeMultiplier={1.5}>
                  {en.createRoom.startNow}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={styles.dotted} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dotSmall} />
          ))}
        </View>
        <View style={styles.whenRow}>
          <View style={[styles.dot, styles.dotEnd]} />
          <Text style={styles.whenLabel} maxFontSizeMultiplier={1.5}>
            {en.createRoom.endLabel}
          </Text>
          <View style={styles.pickers}>
            {(['date', 'hourAndMinute'] as const).map((part) => (
              <Host key={part} matchContents>
                <DatePicker
                  title={en.createRoom.endLabel}
                  selection={new Date(endAt)}
                  range={endRange(now, plus)}
                  displayedComponents={[part]}
                  onDateChange={pickEndAt}
                  modifiers={[labelsHidden(), dynamicTypeSize({ max: 'xxxLarge' })]}
                />
              </Host>
            ))}
          </View>
        </View>
        {/* Human decision: the "start moved" note sits inside the block, so the pinned Create bar never covers it. */}
        {startNote ? <Hint>{startNote}</Hint> : null}
      </View>
      {/* A5: one line of End presets up to 2 days, then More (Plus: 3–7 days; Free: the Plus screen). */}
      <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel={en.createRoom.presetsLabel}>
        {QUICK_PRESETS.map((h) => (
          <Choice key={h} label={en.createRoom.presetLabel(h)} selected={preset === h} onPress={() => pickPreset(h)} />
        ))}
        <Choice
          label={preset === 'more' && choice.kind === 'preset' ? en.createRoom.presetLabel(choice.hours) : en.createRoom.more}
          selected={preset === 'more'}
          onPress={openMore}
        />
      </View>
      {endSnapped ? (
        <>
          <Hint>{en.createRoom.freeEndSnapped}</Hint>
          <Button
            title={en.planPreview.seePlus}
            variant="secondary"
            onPress={() => router.push({ pathname: '/plan-preview', params: { from: 'more' } })}
          />
        </>
      ) : null}
      {offlineTap === 'more' ? <Hint>{en.planPreview.offline}</Hint> : null}
      <Text style={styles.deletes}>{en.createRoom.endHint}</Text>

      <View style={styles.box}>
        <Text style={styles.cardTitle}>{en.createRoom.statusesLabel}</Text>
        <StatusChips labels={statuses} onChange={setStatuses} />
        <Text style={styles.cardNote}>{en.createRoom.statusesHint}</Text>
      </View>
    </QScreen>
  );
}

const outline = {
  borderWidth: StyleSheet.hairlineWidth * 2,
  borderColor: colors.separator,
  borderRadius: 12,
  borderCurve: 'continuous',
} as const;

/** UX P1-10: the People hint names the plan maxima, so it follows FREE/PLUS_MAX_MEMBERS. */
function capacityHint(plus: boolean | null): string {
  return plus
    ? en.createRoom.capacityHintPlus(capacityMax(true))
    : en.createRoom.capacityHintFree(capacityMax(false), capacityMax(true));
}

const styles = StyleSheet.create({
  bar: { ...createBarLayout, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  deletes: { fontSize: 13, color: colors.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: { fontSize: 15, color: colors.label },
  // A3: outlined rows, no grey fill.
  row: { ...outline, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10 },
  // V1: text-field rows (area, meeting place): wash fill, no border, radius 12; ink border only while focused.
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.field,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  fieldRowFocused: { borderColor: colors.tint },
  rowInput: { flex: 1, fontSize: 17, color: colors.label, paddingVertical: 4 },
  rowAction: { fontSize: 15, color: colors.tint, textDecorationLine: 'underline' },
  box: { ...outline, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  cardTitle: { flex: 1, fontSize: 16, color: colors.label },
  cardNote: { fontSize: 12, color: colors.ink2 },
  pinArea: { fontSize: 14, color: colors.label },
  stepOff: { opacity: 0.3 },
  clampRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  clampNote: { fontSize: 13, lineHeight: 18, color: colors.ink2 },
  clampLinkText: { fontWeight: '600', textDecorationLine: 'underline' },
  atMax: { ...textRole.secondary, alignSelf: 'flex-end', fontVariant: ['tabular-nums'] },
  step: { width: size.hit, height: size.hit, alignItems: 'center', justifyContent: 'center' },
  capacity: {
    width: 64,
    minHeight: size.hit,
    textAlign: 'center',
    fontSize: 17,
    color: colors.label,
    backgroundColor: colors.field,
    borderRadius: 10,
    fontVariant: ['tabular-nums'],
  },
  iconChip: { ...outline, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  iconChipOn: { borderColor: colors.label, borderWidth: 2 },
  when: { ...outline, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  whenLabel: { width: 44, fontSize: 16, color: colors.label },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.label },
  dotStart: { backgroundColor: colors.label },
  dotEnd: { backgroundColor: colors.background },
  dotted: { gap: 3, paddingLeft: 3.5, paddingVertical: 1 },
  dotSmall: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.label },
  // UX2-73: matches the iOS compact date picker pill (tertiarySystemFill, 17 pt label).
  timePill: { backgroundColor: PlatformColor('tertiarySystemFill'), borderRadius: 7, borderCurve: 'continuous', paddingHorizontal: 11, paddingVertical: 6 },
  timePillText: { fontSize: 17, color: colors.label },
  pickers: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
});
