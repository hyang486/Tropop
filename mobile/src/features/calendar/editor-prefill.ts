/**
 * /calendar-event route params → the new-event form's first values (pure; no React).
 * - `ask=1`: Trok read the event from a sentence; it opens all day with the "is this right?" subtitle (times ignored).
 * - `start`/`end` (+ optional `startTime`/`endTime`): a prefilled copy, e.g. Calendar v2 day detail "add next".
 *   With both valid times it opens timed; without them it opens all day (the source event had no time).
 * - `date`: the empty-day "Add event" button; that day at the default next-full-hour times.
 * - nothing: today at the default times.
 */
import { isTimeKey, type TimeKey } from './calendar-data';
import { addDays, type DateKey, isDateKey } from './calendar-plan';

export type EditorParams = {
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  emoji?: string;
  ask?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
};

export type EditorPrefill = {
  title: string;
  start: DateKey;
  end: DateKey;
  allDay: boolean;
  startTime: TimeKey;
  endTime: TimeKey;
  emoji: string | undefined;
};

type Fresh = { start: DateKey; startTime: TimeKey; end: DateKey; endTime: TimeKey };

export function editorPrefill(p: EditorParams, fresh: Fresh): EditorPrefill {
  const ask = p.ask === '1';
  // An event has both times or none.
  const timed = !ask && isTimeKey(p.startTime) && isTimeKey(p.endTime);
  let start: DateKey = fresh.start;
  let end: DateKey = fresh.end;
  if (isDateKey(p.start)) {
    start = p.start;
    end = isDateKey(p.end) ? p.end : p.start;
  } else if (isDateKey(p.date)) {
    // Keep the default hour's span (it crosses midnight when opened after 23:00).
    start = p.date;
    end = fresh.end === fresh.start ? p.date : addDays(p.date, 1);
  }
  return {
    title: p.title ?? '',
    start,
    end,
    allDay: ask || (isDateKey(p.start) && !timed),
    startTime: timed ? (p.startTime as TimeKey) : fresh.startTime,
    endTime: timed ? (p.endTime as TimeKey) : fresh.endTime,
    emoji: p.emoji,
  };
}
