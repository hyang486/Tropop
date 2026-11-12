/**
 * Hand-written row and response types for Qrewing AI (planning/QREWING_AI_SPEC_EN.md sections 1 and 2).
 * Replace the row types with `Tables<'...'>` from `@/lib/database.types` once developer regenerates it after
 * migration 0027 is applied.
 */

export type QrewingError =
  | 'ai_not_configured'
  | 'ai_off'
  | 'not_member'
  | 'not_muted'
  | 'no_entry'
  | 'too_early'
  | 'ai_failed'
  | 'network';

/** 1.1 public.qrewing_rooms */
export type QrewingRoomRow = {
  room_id: string;
  ai_enabled: boolean;
  entry_required: boolean;
  updated_at: string;
};

/** 1.2 public.qrewing_members */
export type QrewingMemberRow = {
  room_id: string;
  user_id: string;
  ai_ok_at: string | null;
  mute_small_talk: boolean;
  updated_at: string;
};

/** 1.3 public.entry_profiles */
export type EntryProfileRow = {
  room_id: string;
  user_id: string;
  headline: string;
  interests: string;
  looking_for: string;
  links: string[];
  updated_at: string;
};

/** 1.4 public.message_triage */
export type MessageTriageRow = {
  message_id: string;
  room_id: string;
  state: 'pending' | 'done' | 'skipped';
  important: boolean | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

/** 1.5 public.room_recaps */
export type RoomRecapRow = {
  room_id: string;
  state: 'pending' | 'done' | 'failed';
  title: string | null;
  summary: string | null;
  highlights: string[] | null;
  created_at: string;
  updated_at: string;
};

/** 2.1 triage response item */
export type TriageResult = {
  messageId: string;
  state: 'done' | 'pending' | 'skipped';
  important: boolean | null;
  reason: string | null;
};

/** 2.2 recap response (200) */
export type RecapResult = {
  state: 'done';
  title: string;
  summary: string;
  highlights: string[];
  generatedAt: string;
  cached: boolean;
};

/** 2.3 match response item */
export type Match = {
  userId: string;
  displayName: string;
  headline: string;
  reason: string;
  score: number;
};

/** 2.3 match response (200) */
export type MatchResult = {
  matches: Match[];
  cached: boolean;
  stale?: boolean;
  generatedAt: string;
};
