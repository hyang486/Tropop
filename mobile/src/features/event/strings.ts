// UI copy for Qrewing AI event features. Moves into an `en.ts` section at the merge step (spec section 4).
//
// en.ts merge plan (event first, then pace):
// 1. Move this object into en.ts as `en.qrewing` (keys unchanged), switch imports from eventStrings to en.qrewing,
//    delete this file.
// 2. Spec 7.4: `endRoom` below REPLACES en.endRoom.deleted, effects and effectsLabel, and the end-room comment
//    above en.endActivity becomes: "end_room sets deleted_at and grace_until = now + 30 min: chat and every room
//    feature close at once; only the recap, Photos of me and downloads stay readable until grace ends, then the
//    room-janitor (every 5 minutes) deletes the room's rows and storage." end-confirm.tsx then reads en.endRoom again.
// 3. Scheduled-end copy (rooms that reach expires_at, no grace) stays as it is.
export const eventStrings = {
  create: {
    aiLabel: 'Qrewing AI',
    aiHint:
      'Qrewing flags important messages, suggests people to meet and writes a recap when the room ends. Each member decides whether their messages are included.',
    entryLabel: 'Ask attendees for entry info',
    entryHint: 'Attendees fill in a short intro (what they do, interests, links) before they chat.',
    aiSaveFailed: 'The room was created, but Qrewing AI could not be turned on. You can try again from Room info.',
  },
  disclosure: {
    title: 'Qrewing AI is on in this room',
    body: [
      'In this room, your messages and entry info are sent to Anthropic’s Claude to flag important messages, suggest people to meet and write a recap.',
      'Host messages and messages with @everyone, @all or @here are highlighted by simple rules in Qrew, without AI. Only other messages, and only from members who agreed, are sent to the AI.',
      'Qrew deletes them, along with everything Qrewing made from them, when the room ends.',
      'If you choose Not now, your messages stay out of every Qrewing request. You can agree later from Room info.',
    ],
    agree: 'Agree',
    notNow: 'Not now',
    failed: 'Could not save your choice. Try again.',
  },
  entry: {
    title: 'Introduce yourself',
    intro: 'The host asks attendees for a short intro. Everyone in this room can see it, and it is deleted when the room ends.',
    headline: 'Headline',
    headlinePlaceholder: 'CS junior at SJSU',
    interests: 'Interests',
    interestsPlaceholder: 'Agentic AI, mobile apps',
    lookingFor: 'Looking for',
    lookingForPlaceholder: 'Mentors working on AI products',
    links: 'Links (optional, up to 3)',
    linkPlaceholder: 'https://linkedin.com/in/…',
    linksNote: 'Links are shown to attendees only. Qrewing does not open them.',
    save: 'Save',
    saved: 'Saved',
    headlineRequired: 'Add a headline.',
    headlineTooLong: (max: number) => `Keep the headline under ${max} characters.`,
    tooLong: (field: string, max: number) => `${field} can be up to ${max} characters.`,
    linkInvalid: 'Each link must start with https:// and be up to 200 characters.',
    tooManyLinks: 'Add up to 3 links.',
    loadFailed: 'Could not load your entry info. Check your connection and try again.',
    saveFailed: 'Could not save your entry info. Try again.',
    retry: 'Try again',
  },
  info: {
    section: 'Qrewing AI',
    consentOn: 'Your messages are included',
    consentOff: 'Your messages are not included',
    agree: 'Include my messages',
    withdraw: 'Stop including my messages',
    editEntry: 'Edit my entry info',
    addEntry: 'Add my entry info',
    peopleToMeet: 'People to meet',
    loadFailed: 'Could not load Qrewing settings. Try again.',
    saveFailed: 'Could not save this change. Try again.',
    retry: 'Try again',
  },
  mute: {
    label: 'Mute small talk',
    on: 'Showing important messages',
    hidden: (n: number) => (n === 1 ? '1 message hidden' : `${n} messages hidden`),
    showAll: 'Show',
    needsConsent: 'Agree to Qrewing AI first to mute small talk.',
    banner: (reason: string) => `Important: ${reason}`,
    mentioned: 'You were mentioned',
    dismiss: 'Dismiss',
    unavailable: 'Qrewing is not available right now. All messages are shown.',
    saveFailed: 'Could not change Mute small talk. Try again.',
  },
  people: {
    title: 'People to meet',
    refresh: 'Refresh',
    loading: 'Qrewing is reading entry info…',
    empty: 'No one else has shared entry info yet.',
    noEntry: 'Add your entry info first so Qrewing knows who to suggest.',
    stale: 'Showing the last list. A new one is available in a few minutes.',
    pending: 'Qrewing is still finding people to meet.',
    pendingFinal: 'Qrewing is still finding people to meet. Tap Refresh to check again.',
    updating: 'Showing the last list while Qrewing updates it.',
    updatingFinal: 'Showing the last list. Tap Refresh to check again.',
    updateFailed: 'Could not update the list. Tap Refresh to try again.',
    failed: 'Could not get suggestions. Try again.',
    notConsented: 'Agree to Qrewing AI to get suggestions.',
  },
  recap: {
    title: 'Recap',
    none: 'No recap was saved for this room.',
    pending: 'Qrewing is still writing the recap.',
    offline: 'Could not get the recap. Check your connection.',
    retry: 'Try again',
    you: 'You in this room',
    messages: (n: number) => (n === 1 ? '1 message sent' : `${n} messages sent`),
    media: (n: number) => (n === 1 ? '1 photo or file shared' : `${n} photos and files shared`),
    photosOfMe: (n: number) => (n === 1 ? '1 photo of you' : `${n} photos of you`),
    arrived: (time: string) => `Arrived at ${time}`,
    savedHere: 'Saved on this phone only.',
  },
  // Spec 7.4: the host's early end now keeps the recap and photos for 30 minutes (human decision 2026-11-12 (b)).
  endRoom: {
    deleted:
      'Chat closes now. The recap and photos stay available for 30 minutes, then messages, photos and files are deleted from the server. Anything already saved to a phone stays there.',
    effects: 'Closes now · Deleted after 30 min',
    effectsLabel: 'The room closes now. The recap and photos stay for 30 minutes, then everything is deleted.',
    // Qrewing AI off (or unknown): no recap is written, so the copy names photos only.
    deletedNoRecap:
      'Chat closes now. Photos stay available for 30 minutes, then messages, photos and files are deleted from the server. Anything already saved to a phone stays there.',
    effectsLabelNoRecap: 'The room closes now. Photos stay for 30 minutes, then everything is deleted.',
  },
  grace: {
    availableUntil: (time: string) => `Recap and photos available until ${time}`,
    closedNote: 'Chat and the room are closed. After that time, everything is deleted from the server.',
    photosOfMe: 'Photos of me',
    photosAndFiles: 'Photos & files',
    listRow: (time: string) => `Ended · recap and photos until ${time}`,
    readOnly: (time: string) => `The room has ended. View and download until ${time}.`,
    writeClosed: 'This room has ended. Only viewing and downloads still work.',
    notSetUp: 'Photos of me was not set up before the room ended.',
  },
  errors: {
    ai_not_configured: 'Qrewing is not set up yet.',
    ai_off: 'Qrewing AI is off in this room.',
    not_member: 'You are not in this room.',
    not_muted: 'Turn on Mute small talk first.',
    no_entry: 'Add your entry info first.',
    too_early: 'The recap is available in the last hour of the room.',
    ai_failed: 'Qrewing could not finish this. Try again.',
    network: 'No connection. Try again.',
  },
} as const;
