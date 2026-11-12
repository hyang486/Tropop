// Pace maker UI copy. Kept here during the build; moved into an en.ts section at the merge step (spec 4).
const km = (m: number) => (m / 1000).toFixed(2);

export const paceStrings = {
  title: 'Pace maker',
  switchHint: 'Qrewing coaches your pace on this phone while you share your location. Nothing is sent to a server.',
  needsSharing: 'Turn on Share my location to use the pace maker.',
  needsActivity: 'Cues start when the host starts the activity.',
  target: 'Target',
  targetUsual: (pace: string | null) => (pace ? `My usual pace (${pace} per km)` : 'My usual pace (no runs yet)'),
  targetPace: 'Target pace',
  targetTime: 'Time for distance',
  pacePlaceholder: '5:30',
  distancePlaceholder: 'km',
  timePlaceholder: 'h:mm:ss',
  perKm: 'per km',
  save: 'Save target',
  saved: 'Target saved.',
  invalidPace: 'Enter a pace like 5:30.',
  invalidTime: 'Enter a distance in km and a time like 50:00 or 1:45:00.',
  noTarget: 'No target yet. Run once, or set a target pace.',
  // The recap's pace line (features/recap shows it under my part; spec 3.3).
  recap: (distanceM: number, duration: string, pace: string) => `Pace maker: ${km(distanceM)} km in ${duration}, ${pace} per km`,
  stats: (distanceM: number, duration: string, pace: string | null) =>
    `${km(distanceM)} km · ${duration}${pace ? ` · ${pace} per km` : ''}`,
  // Cues (spoken when voice is available; otherwise a vibration and this banner).
  cueKm: (n: number, pace: string | null, target: string | null) =>
    `Kilometer ${n}${pace ? `: ${pace} per km` : ''}${target ? `, target ${target}` : ''}.`,
  cueSlow: (pace: string, target: string) => `Pick it up: ${pace} per km, target ${target}.`,
  cueFast: (pace: string, target: string) => `Ease off: ${pace} per km, target ${target}.`,
  cueGap: (gapM: number, pace: string) =>
    `Lead group ${gapM} meters ahead. Run ${pace} per km to catch them in 3 minutes.`,
  cueDismiss: 'Dismiss cue',
  stationaryTitle: "You've stopped for 3 minutes. Everything okay?",
  stationaryBody: 'Set your status so your crew knows, or dismiss.',
  setStatus: 'Set status',
  dismiss: 'Dismiss',
};
