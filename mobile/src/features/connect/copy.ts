import { CONNECT_APP_NAMES, type ConnectApp, type ConnectErrorKind } from '@/lib/connect-plan';

const app = (a: ConnectApp) => CONNECT_APP_NAMES[a];
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Connect copy (ux connect-spec §8, connect-mocks 01-06). Kept here, not in en.ts, so parallel branches merge cleanly. */
export const connectCopy = {
  shortDate,
  appName: app,

  // Profile rows
  myCodesRow: 'My QR codes',
  myCodesValue: (n: number) => (n === 0 ? 'None' : `${n} added`),
  connectionsRow: 'Connections',
  pendingBadge: (n: number) => `${n} new ${n === 1 ? 'request' : 'requests'}`,

  // 01 My QR codes
  myCodesTitle: 'My QR codes',
  myCodesSubtitle: 'People you connect with in a room can see these. Nobody else can.',
  myCodesFooter: 'Add a screenshot of your QR code from each app. We crop it to the code.',
  add: 'Add',
  addLabel: (a: ConnectApp) => `Add your ${app(a)} QR code`,
  added: (iso: string) => `Added ${shortDate(iso)}`,
  reportedOn: (iso: string) => `Reported ${shortDate(iso)}`,
  reportedTitle: (who: string | null, a: ConnectApp) => `${who ?? 'Someone'} said your ${app(a)} code didn't work`,
  reportedBody: (a: ConnectApp) => `${app(a)} codes can be reset. Add your new one.`,
  replace: 'Replace',
  noQrFound: "We couldn't find a QR code in this image. Try a clearer screenshot.",
  looksLike: (a: ConnectApp) => `This looks like a ${app(a)} code`,
  addTo: (a: ConnectApp) => `Add to ${app(a)}`,
  notFor: (a: ConnectApp) => `This QR isn't for ${app(a)}.`,
  chooseAnother: 'Choose another',
  previewTitle: (a: ConnectApp) => `Check your ${app(a)} code`,
  showFull: 'Show the full screenshot',
  previewBody: (a: ConnectApp) => `Connections can open ${app(a)} from this code.`,
  save: 'Save',
  cancel: 'Cancel',

  // QR detail (mine)
  remove: 'Remove',
  removeTitle: (a: ConnectApp) => `Remove your ${app(a)} code?`,
  removeBody: "Your connections won't see it anymore.",
  reportedNotice: (who: string | null, a: ConnectApp, iso: string) =>
    `${who ?? 'Someone'} said this code didn't work on ${shortDate(iso)}. ${app(a)} codes can be reset. Replace it with a new one?`,
  /** null = mine ("Your LINE QR code"); otherwise "Sora's LINE QR code". */
  qrLabel: (owner: string | null, a: ConnectApp) => `${owner == null ? 'Your' : `${owner}'s`} ${app(a)} QR code`,

  // 02 Person card
  inRoom: (room: string) => `In ${room}`,
  has: 'Has',
  connect: 'Connect',
  connectLabel: (name: string) => `Connect with ${name}`,
  connectHint: (name: string) => `Shares your QR codes after ${name} accepts.`,
  youllShare: (apps: string, name: string) => `You'll share: ${apps} · Only after ${name} accepts`,
  theyHaveNone: (name: string) => `${name} hasn't added any QR codes.`,
  requested: 'Requested',
  cancelRequest: 'Cancel request',
  accept: 'Accept',
  decline: 'Decline',
  connected: 'Connected',
  requestSent: 'Request sent',
  connectedWith: (name: string) => `Connected with ${name}`,
  addFirstTitle: 'Add a QR code first',
  addFirstBody: "Pick the app you want to share. They'll share theirs too.",
  addFirstAction: 'Add a QR code',

  // 03 Connections
  connectionsTitle: 'Connections',
  requests: 'Requests',
  sent: 'Sent',
  connectedSection: 'Connected',
  metIn: (room: string) => `Met in ${room}`,
  expiresIn: (days: number) => `Expires in ${days} ${days === 1 ? 'day' : 'days'}`,
  shares: (apps: string) => `Shares: ${apps}`,
  requestsFooter: "You'll share all your codes when you accept. Requests expire after 14 days.",
  requestedOn: (iso: string) => `Requested ${shortDate(iso)}`,
  connectedOn: (iso: string) => `Connected ${shortDate(iso)}`,
  empty: 'Meet someone in a room? Tap their name to connect.',

  // 04 Plus sheet
  plusTitle: 'Connect with more people',
  plusBody: 'Free includes 1 connection. Plus has no limit.',
  plusKeepsRequest: (name: string) => `${name}'s request stays here until you decide.`,
  seePlus: 'See Plus',
  notNow: 'Not now',

  // 05 Connection detail
  updated: 'Updated',
  openIn: (a: ConnectApp) => `Open in ${app(a)}`,
  codeNotWorking: 'Code not working?',
  notOnPhone: (a: ConnectApp) => `${app(a)} isn't on this phone.`,
  getApp: (a: ConnectApp) => `Get ${app(a)}`,
  letKnowTitle: (name: string) => `Let ${name} know?`,
  letKnowBody: (a: ConnectApp, name: string) =>
    `${app(a)} codes can be reset. We'll ask ${name} to add a new one. We won't tell them anything else.`,
  letKnowAction: 'Let them know',
  toldOn: (name: string) => `You told ${name}`,
  noCodesNow: (name: string) => `${name} has no codes right now.`,
  removeConnection: 'Remove connection',
  removeConnectionTitle: (name: string) => `Remove ${name}?`,
  removeConnectionBody: "You'll both stop seeing each other's codes.",

  // 06 Fallback
  fallbackTitle: (name: string, a: ConnectApp) => `${name}'s ${app(a)} code`,
  cantOpenFromLink: (a: ConnectApp) => `${app(a)} can't be opened from a link.`,
  saveToPhotos: 'Save to Photos',
  savedToPhotos: 'Saved to Photos',
  openApp: (a: ConnectApp) => `Open ${app(a)}`,
  fallbackHow: (a: ConnectApp) => `In ${app(a)}, tap Scan and choose this photo.`,
  photosDenied: 'Allow Qrew to add photos in Settings.',
  openSettings: 'Open Settings',
  close: 'Close',

  someone: 'Someone',
  loadFailed: "Couldn't load this. Pull to try again.",
  errors: {
    limit: 'Free includes 1 connection. Plus has no limit.',
    otherLimit: "They can't add more connections right now.",
    noCodes: 'Add a QR code first.',
    theyHaveNoCodes: "They haven't added any QR codes.",
    throttled: "You've sent a lot of requests today. Try again tomorrow.",
    roomClosed: 'This room has ended.',
    notConnectable: "You can't connect with this person.",
    accountRequired: 'Create an account to connect.',
    notFound: 'This request is no longer available.',
    badLink: 'This QR code can’t be used.',
    badImage: "We couldn't read this image. Try another screenshot.",
    tooLarge: 'This image is too large. Try a screenshot.',
    offline: 'No connection. Try again.',
    generic: 'That did not go through. Try again.',
  } satisfies Record<ConnectErrorKind, string>,
};
