// UX P2-1: Create room status options as removable chips plus a "+ Add" chip, instead of comma-separated text.
// Validation is the info editor's (normalizeStatusLabels), so both screens accept and reject the same labels.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, size, space } from '@/components/ui';
import { en } from '@/i18n/en';
import { normalizeStatusLabels, STATUS_LABEL_MAX } from '@/lib/status-plan';
import { useAnnounce } from '@/features/event/announce';

export function StatusChips({ labels, onChange }: { labels: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useAnnounce(problem, problem);

  function commit() {
    const text = (draft ?? '').trim();
    if (!text) {
      setDraft(null);
      setProblem(null);
      return;
    }
    const result = normalizeStatusLabels([...labels, text]);
    if (!result.ok) {
      const s = en.statusEditor;
      setProblem(
        result.error === 'tooLong'
          ? s.tooLong(result.label, STATUS_LABEL_MAX)
          : result.error === 'emergency'
            ? s.emergency
            : s.duplicate(result.label),
      );
      return;
    }
    onChange(result.labels);
    setDraft(null);
    setProblem(null);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {labels.map((label) => (
          <View key={label} style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.statusEditor.remove(label)}
              onPress={() => onChange(labels.filter((l) => l !== label))}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 8 }}
              style={styles.remove}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
        {draft !== null ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              setProblem(null);
            }}
            onSubmitEditing={commit}
            onBlur={commit}
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            placeholder={en.statusEditor.placeholder}
            placeholderTextColor={colors.secondaryLabel}
            accessibilityLabel={en.statusEditor.placeholder}
            maxLength={STATUS_LABEL_MAX * 2 + 10}
            style={[styles.chip, styles.input]}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={en.statusEditor.add}
            onPress={() => setDraft('')}
            // UX2-35: 36 pt chip, 44 pt target.
            hitSlop={{ top: 4, bottom: 4 }}
            style={({ pressed }) => [styles.chip, styles.add, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.chipText}>{en.createRoom.statusesAdd}</Text>
          </Pressable>
        )}
      </View>
      {problem ? (
        <Text style={styles.problem} accessibilityLiveRegion="polite">
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, alignItems: 'center' },
  chip: {
    height: size.chip,
    borderRadius: size.chip / 2,
    backgroundColor: colors.field,
    paddingLeft: 14,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { fontSize: 15, color: colors.label },
  // The × is 36 pt inside the chip; hitSlop takes it to 44 pt.
  remove: { width: size.chip, height: size.chip, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 20, lineHeight: 22, color: colors.ink2 },
  add: { paddingRight: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, backgroundColor: 'transparent' },
  input: { minWidth: 120, paddingRight: 14, fontSize: 15, color: colors.label },
  problem: { fontSize: 13, color: colors.errorText },
});
