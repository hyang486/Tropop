/**
 * Plus page v2 (/plan-preview?from=...), built to docs/evidence/plus-page-mockup/v2.html: one screen, a feature
 * preview and headline picked by `from`, then three one-line benefits that skip the one already previewed.
 * Pushers: calendar (Add with Qrewing, Free tap or 402), diary (calendar diary upsell), room-ai (room Qrewing
 * button), more (create-room "More" end time / PT402), people (room size, no caller yet), capacity (create-room
 * People + at the Free max, capacity option B). The profile link sends
 * no `from`; unknown values count as none, and none shows the diary preview.
 */
// capacity B item 4: 'ask' and 'pace' are personal features on the caller's own plan (existing slides, no new one).
export const PLUS_FROM = ['calendar', 'room-ai', 'more', 'people', 'diary', 'capacity', 'ask', 'pace', 'meet', 'storage'] as const;
export type PlusFrom = (typeof PLUS_FROM)[number];

// Human tiers (USER_DECISIONS l.288-289, l.296, l.299, l.307): calendar AI add, diary, room Qrewing AI, rooms
// up to 30 people and 7 days. `recap` is part of room Qrewing AI, worded for the room preview.
export const PLUS_LINES = ['ai', 'rooms', 'add', 'diary', 'recap'] as const;
export type PlusLine = (typeof PLUS_LINES)[number];

export const PLUS_PREVIEWS = ['diary', 'chat', 'trip'] as const;
export type PlusPreview = (typeof PLUS_PREVIEWS)[number];

const PITCH: Record<PlusPreview, readonly [PlusLine, PlusLine, PlusLine]> = {
  diary: ['ai', 'rooms', 'add'],
  chat: ['recap', 'rooms', 'diary'],
  trip: ['ai', 'diary', 'add'],
};

const PREVIEW: Record<PlusFrom, PlusPreview> = {
  calendar: 'diary',
  diary: 'diary',
  'room-ai': 'chat',
  more: 'trip',
  people: 'trip',
  capacity: 'trip',
  ask: 'chat',
  pace: 'trip',
  // UX2-01: People to meet is a Qrewing AI feature, so the room AI pitch ('people' is the room-size source).
  meet: 'chat',
  // UX2-06: a Free room out of space; Plus rooms hold more (trip pitch, like room size).
  storage: 'trip',
};

/** The route param (string, array or missing) → a known source, or null (no reason card). */
export function plusFrom(param: unknown): PlusFrom | null {
  const v = Array.isArray(param) ? param[0] : param;
  return (PLUS_FROM as readonly unknown[]).includes(v) ? (v as PlusFrom) : null;
}

/** The preview card and the three benefit lines for a source (none: the diary pitch). */
export function plusPitch(from: PlusFrom | null): { preview: PlusPreview; lines: readonly PlusLine[] } {
  const preview = from ? PREVIEW[from] : 'diary';
  return { preview, lines: PITCH[preview] };
}

/**
 * Calendar bottom-right Qrewing tap: Plus opens the ask sheet; Free goes straight to the Plus page with no
 * server call and no error (human rule: a Free user never hits a dead or locked Qrewing button). Hidden while
 * the plan is unread (null), so a Plus member is never sent to the page by a slow read.
 */
export function addTapAction(plus: boolean | null): 'ask' | 'intro' | null {
  return plus === null ? null : plus ? 'ask' : 'intro';
}

export const plusIntroHref = (from: PlusFrom) => `/plan-preview?from=${from}` as const;
