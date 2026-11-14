/**
 * People to meet empty states (UI audit 7). A room with no entry questions can never get suggestions, so it says
 * so instead of "Tell Qrewing about you" plus "Add my entry info", which led to the entry screen's dead end.
 * questions: the same useEntryQuestions read the entry screen uses.
 */
export type PeopleEmpty = 'noQuestions' | 'noEntry' | 'noMatches' | null;

/**
 * UX2-01: the gate in place of the list, or null. plus: a Free user (known at mount, so no request) or a 402
 * plan_limit (a deep link, a lapsed plan, or the plan still loading); it wins over consent, as the server checks the
 * plan first. consent: on Plus (or not known yet) and not agreed to Qrewing AI here. Neither is an error.
 */
export type PeopleGate = 'plus' | 'off' | 'unavailable' | 'left' | 'consent';

/**
 * UX2-09: dead ends a Refresh can't fix (pattern D), from the server's answer: off (the host turned Qrewing AI off),
 * unavailable (ai_not_configured), left (not_member: the screen closes, like Ask). They win over consent, which is
 * only my local read.
 */
export function peopleGate(input: { plus: boolean | null; error: string | null; notConsented: boolean }): PeopleGate | null {
  if (input.plus === false || input.error === 'plan_limit') return 'plus';
  if (input.error === 'ai_off') return 'off';
  if (input.error === 'ai_not_configured') return 'unavailable';
  if (input.error === 'not_member') return 'left';
  return input.notConsented ? 'consent' : null;
}

export function peopleEmpty(input: {
  status: 'loading' | 'pending' | 'error' | 'ready';
  error: string | null;
  matches: number;
  notConsented: boolean;
  questions: { loaded: boolean; failed: boolean; count: number };
}): PeopleEmpty {
  if (input.notConsented) return null;
  const noEntry = input.status === 'error' && input.error === 'no_entry';
  const noMatches = input.status === 'ready' && input.matches === 0;
  if (!noEntry && !noMatches) return null;
  const q = input.questions;
  if (q.loaded && !q.failed && q.count === 0) return 'noQuestions';
  return noEntry ? 'noEntry' : 'noMatches';
}
