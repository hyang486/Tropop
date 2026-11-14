/**
 * Plus page (/plan-preview?from=...), built to docs/evidence/plus-page-mockup. `from` picks the reason card and
 * moves the tapped benefit(s) to the top. Pushers: calendar (Add with Qrewing, Free tap or 402), diary (calendar
 * diary upsell), room-ai (room Qrewing button), more (create-room "More" end time / PT402), people (room size).
 * The profile link sends no `from`: no reason card, default order. Unknown values count as none.
 */
export const PLUS_FROM = ['calendar', 'room-ai', 'more', 'people', 'diary'] as const;
export type PlusFrom = (typeof PLUS_FROM)[number];

// Human tiers (USER_DECISIONS l.288-289, l.307): calendar AI add, diary, more people and days, room Qrewing AI.
export const PLUS_BENEFITS = ['diary', 'add', 'ai', 'people', 'days'] as const;
export type PlusBenefit = (typeof PLUS_BENEFITS)[number];

const FOCUS: Record<PlusFrom, readonly PlusBenefit[]> = {
  calendar: ['diary', 'add'],
  diary: ['diary'],
  'room-ai': ['ai'],
  more: ['days'],
  people: ['people'],
};

/** The route param (string, array or missing) → a known source, or null (no reason card). */
export function plusFrom(param: unknown): PlusFrom | null {
  const v = Array.isArray(param) ? param[0] : param;
  return (PLUS_FROM as readonly unknown[]).includes(v) ? (v as PlusFrom) : null;
}

/** The benefits in display order: the ones matching `from` first (marked), then the rest in default order. */
export function plusBenefits(from: PlusFrom | null): { key: PlusBenefit; focus: boolean }[] {
  const focus = from ? FOCUS[from] : [];
  return [...focus, ...PLUS_BENEFITS.filter((k) => !focus.includes(k))].map((key) => ({ key, focus: focus.includes(key) }));
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
