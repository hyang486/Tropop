#!/usr/bin/env node
// Pace maker GPS demo for the iOS simulators (qa runs it; see scripts/pace-gps-demo.md).
// Drives `xcrun simctl location <udid> start --speed=<m/s> --interval=<s> <lat,lon>...` along JFK Drive in
// Golden Gate Park, east to west. Each `start` replaces the device's running scenario, so a speed change is a new
// `start` from where the last one ended, after waiting for it to finish.
//
//   node scripts/pace-gps-demo.mjs <steady|gap|stop|clear> [--host <udid>] [--guest <udid>] [--dry-run]

import { spawn } from 'node:child_process';

const DEFAULT_HOST = '91F3BFB3-4AB3-45AD-A1BC-8C61641A535F'; // iPhone 17 Pro
const DEFAULT_GUEST = 'F11BA960-84AE-4AFA-A234-92800AF43B9E'; // iPhone 17

/** JFK Drive, Golden Gate Park: Stanyan entrance west to Spreckels Lake (about 3.6 km). */
export const ROUTE = [
  [37.77226, -122.45495],
  [37.77183, -122.46043],
  [37.77136, -122.4662],
  [37.77083, -122.47335],
  [37.77023, -122.48164],
  [37.77011, -122.489],
  [37.77003, -122.49565],
];

/** 5:00 per km. */
export const STEADY_MPS = 1000 / 300;
/** Location updates every 2 s; the app's reporter still sends at most every 5 s or 10 m (location-plan). */
const INTERVAL_S = 2;

const rad = Math.PI / 180;
export function distanceM([aLat, aLon], [bLat, bLon]) {
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeLength(route = ROUTE) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += distanceM(route[i - 1], route[i]);
  return total;
}

/** The waypoints from `fromM` to `toM` meters along the route, cut at both ends. */
export function slice(fromM, toM, route = ROUTE) {
  const out = [];
  let along = 0;
  const at = (a, b, share) => [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share].map((v) => +v.toFixed(6));
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = distanceM(a, b);
    const start = along;
    const end = along + len;
    if (end >= fromM && start <= toM && len > 0) {
      if (!out.length) out.push(at(a, b, Math.max(0, (fromM - start) / len)));
      if (end < toM) out.push(b.map((v) => +v.toFixed(6)));
      else {
        out.push(at(a, b, (toM - start) / len));
        break;
      }
    }
    along = end;
  }
  return out;
}

/**
 * A device's plan: legs run one after another. A run leg moves `fromM`..`toM` at `mps`; a hold leg stays put
 * for `holdS` (simctl `set`; the reporter's 30 s heartbeats keep the fixes fresh).
 */
function runLeg(fromM, toM, mps, label) {
  return { kind: 'run', fromM, toM, mps, seconds: (toM - fromM) / mps, label };
}
function holdLeg(atM, holdS, label) {
  return { kind: 'hold', atM, seconds: holdS, label };
}

export function plans(scenario, length = routeLength()) {
  const end = Math.floor(length);
  if (scenario === 'steady') {
    return { host: [runLeg(0, end, STEADY_MPS, 'steady 5:00 per km to the end')] };
  }
  if (scenario === 'gap') {
    // Guest: 2.5 m/s (6:40 per km) for 6 minutes falls 300 m behind the host's 5:00; then 4.5 m/s closes
    // 300 m at 1.17 m/s in about 4.3 minutes; then the host's pace to the end.
    const slowEnd = 2.5 * 360;
    const catchS = 300 / (4.5 - STEADY_MPS);
    const fastEnd = Math.round(slowEnd + 4.5 * catchS);
    return {
      host: [runLeg(0, end, STEADY_MPS, 'lead: steady 5:00 per km')],
      guest: [
        runLeg(0, slowEnd, 2.5, 'slow 6:40 per km for 6 minutes (falls about 300 m behind)'),
        runLeg(slowEnd, fastEnd, 4.5, 'fast 3:42 per km (catches up in about 4 minutes)'),
        runLeg(fastEnd, end, STEADY_MPS, 'back to 5:00 per km with the lead'),
      ],
    };
  }
  if (scenario === 'stop') {
    return {
      host: [
        runLeg(0, 600, STEADY_MPS, 'run 600 m at 5:00 per km'),
        holdLeg(600, 240, 'stand still 4 minutes (the prompt is due at 3)'),
        runLeg(600, 1300, STEADY_MPS, 'run on 700 m at 5:00 per km'),
      ],
    };
  }
  throw new Error(`unknown scenario: ${scenario}`);
}

export function commands(udid, leg) {
  if (leg.kind === 'hold') {
    const [lat, lon] = slice(leg.atM, leg.atM + 1)[0];
    return ['xcrun', 'simctl', 'location', udid, 'set', `${lat},${lon}`];
  }
  const points = slice(leg.fromM, leg.toM).map(([lat, lon]) => `${lat},${lon}`);
  return [
    'xcrun',
    'simctl',
    'location',
    udid,
    'start',
    `--speed=${leg.mps.toFixed(3)}`,
    `--interval=${INTERVAL_S}`,
    ...points,
  ];
}

// --- runner -----------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { scenario: null, host: DEFAULT_HOST, guest: DEFAULT_GUEST, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--host') args.host = argv[++i];
    else if (a === '--guest') args.guest = argv[++i];
    else if (!a.startsWith('--') && !args.scenario) args.scenario = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!args.scenario) throw new Error('usage: pace-gps-demo.mjs <steady|gap|stop|clear> [--host udid] [--guest udid] [--dry-run]');
  if (!args.host || (args.scenario === 'gap' && !args.guest)) throw new Error('missing device UDID');
  return args;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function exec(cmd, dryRun) {
  console.log(`$ ${cmd.join(' ')}`);
  if (dryRun) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const p = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd.join(' ')} exited ${code}`))));
  });
}

async function drive(name, udid, legs, dryRun) {
  let t = 0;
  for (const leg of legs) {
    console.log(`[${name} +${fmt(t)}] ${leg.label} (${fmt(leg.seconds)})`);
    const began = Date.now();
    await exec(commands(udid, leg), dryRun);
    // Whether `start` returns at once or after the path, the next leg begins when this one should have ended.
    if (!dryRun) await sleep(Math.max(0, leg.seconds * 1000 - (Date.now() - began)));
    t += leg.seconds;
  }
  console.log(`[${name} +${fmt(t)}] done (the last position stays until clear)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const devices = { host: args.host, guest: args.guest };
  if (args.scenario === 'clear') {
    for (const udid of [args.host, args.guest].filter(Boolean)) {
      await exec(['xcrun', 'simctl', 'location', udid, 'clear'], args.dryRun);
    }
    return;
  }
  const plan = plans(args.scenario);
  console.log(`Route: JFK Drive, Golden Gate Park, ${Math.round(routeLength())} m east to west.${args.dryRun ? ' Dry run.' : ''}`);
  const stop = async () => {
    for (const name of Object.keys(plan)) await exec(['xcrun', 'simctl', 'location', devices[name], 'clear'], args.dryRun);
    process.exit(130);
  };
  if (!args.dryRun) process.on('SIGINT', stop);
  await Promise.all(Object.entries(plan).map(([name, legs]) => drive(name, devices[name], legs, args.dryRun)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
