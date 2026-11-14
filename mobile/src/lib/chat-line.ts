/**
 * UX P1-2: how a stored system/emergency chat body is shown. The server writes these bodies (migrations 0002,
 * 0023, 0024) and Qrewing reads them, so the stored text stays; only the display is shortened to one grey line.
 */
export type ChatLine = { kind: 'emergency'; name: string } | { kind: 'activityStarted' } | { kind: 'plain'; text: string };

const EMERGENCY = /^(.+) needs help \(Emergency\)$/;
const ACTIVITY_STARTED = 'Activity started. Open Map to share your location.';

export function chatLine(kind: string, body: string): ChatLine {
  if (kind === 'emergency') {
    const m = EMERGENCY.exec(body);
    if (m) return { kind: 'emergency', name: m[1] };
  }
  if (kind === 'system' && body === ACTIVITY_STARTED) return { kind: 'activityStarted' };
  return { kind: 'plain', text: body };
}
