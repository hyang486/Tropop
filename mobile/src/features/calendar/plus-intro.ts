/**
 * Plus intro (/plan-preview?from=...): where the member came from picks the headline and the benefit shown first.
 * Pushers: calendar (Add with Qrewing, Free tap or 402), diary (calendar diary upsell), room-ai (room Qrewing
 * button, developer-event), more (create-room "More" / PT402, profile link). Unknown or missing → 'more'.
 */
export const PLUS_FROM = ['calendar', 'room-ai', 'more', 'diary'] as const;
export type PlusFrom = (typeof PLUS_FROM)[number];

export const PLUS_BENEFITS = ['add', 'diary', 'ai', 'rooms', 'icons'] as const;
export type PlusBenefit = (typeof PLUS_BENEFITS)[number];

const FOCUS: Record<PlusFrom, PlusBenefit> = { calendar: 'add', diary: 'diary', 'room-ai': 'ai', more: 'rooms' };

/** The route param (string, array or missing) → a known source. */
export function plusFrom(param: unknown): PlusFrom {
  const v = Array.isArray(param) ? param[0] : param;
  return (PLUS_FROM as readonly unknown[]).includes(v) ? (v as PlusFrom) : 'more';
}

/** The benefits in display order, the one matching `from` first and marked. */
export function plusBenefits(from: PlusFrom): { key: PlusBenefit; focus: boolean }[] {
  const focus = FOCUS[from];
  return [focus, ...PLUS_BENEFITS.filter((k) => k !== focus)].map((key) => ({ key, focus: key === focus }));
}

/**
 * Calendar bottom-right Qrewing tap: Plus opens the ask sheet; Free goes straight to the Plus intro with no
 * server call and no error (human rule: a Free user never hits a dead or locked Qrewing button). Hidden while
 * the plan is unread (null), so a Plus member is never sent to the intro by a slow read.
 */
export function addTapAction(plus: boolean | null): 'ask' | 'intro' | null {
  return plus === null ? null : plus ? 'ask' : 'intro';
}

export const plusIntroHref = (from: PlusFrom) => `/plan-preview?from=${from}` as const;
