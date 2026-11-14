// UI copy is kept here so it can be translated later. English is the default.
export const en = {
  appName: 'Qrew',
  welcome: {
    // Q 01.01
    // UX3-A03: headline and three value rows.
    headline: "One room for today's crew",
    valueJoinTitle: 'Join in seconds',
    valueJoinLine: "Scan the host's QR or type 5 digits.",
    valuePhotosTitle: 'Photos of you, found for you',
    valuePhotosLine: 'Full-quality photos from everyone.',
    valueGoneTitle: 'Gone when it ends',
    valueGoneLine: 'Chat and photos are deleted at End.',
    join: 'Join a room',
    create: 'Create a room',
    // UX2-27: returning users (Welcome and Guest) go to Log in.
    haveAccount: 'Log in',
    // UX2-42 / UX2-60 / sweep4 P1-3: a join link whose token can't be an invite (notice above the art).
    invalidLinkTitle: "This invite link doesn't work.",
    invalidLinkBody: 'Ask your host for a new one, or enter the code.',
  },
  // Q 02.01
  guest: {
    title: "What's your name?",
    who: 'Only the people in your rooms can see it.\nYou can join without creating an account.',
    submit: 'Join as guest',
  },
  signIn: {
    title: 'Log in',
    submit: 'Log in',
  },
  signUp: {
    title: 'Create account',
    submit: 'Create account',
    hint: 'You need an account to create rooms. Joining rooms does not need one.',
    checkEmail: 'Check your email to confirm the account, then log in.',
  },
  upgrade: {
    title: 'Create account',
    hint: 'Add an email and password to this guest profile. Your rooms stay as they are.',
    submit: 'Create account',
  },
  // Q 01.02 (log in) and 07.02 (sign up, guest upgrade).
  hostAccount: {
    // UX3-A07: the account has two verbs only, Log in and Create account; "Host" is a role inside a room.
    loginTitle: 'Log in',
    loginSubtitle: 'Welcome back.',
    newTitle: 'Create account',
    newSubtitle: 'Create rooms and invite your group.',
    upgradeSubtitle: 'Keep your rooms and start hosting your own.',
    createAccount: 'Create account',
  },
  fields: {
    email: 'Email address',
    password: 'Password',
    // UX3-A05: the password rule as a helper under the field, the eye button and example placeholders.
    passwordHelper: 'At least 6 characters.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    emailExample: 'name@example.com',
    name: 'Display name',
  },
  home: {
    title: 'Rooms',
    // UX3-A02: the 48 pt pair over a list, the empty line and the section headers.
    joinShort: 'Join',
    createShort: 'Create',
    emptyLine: 'Rooms you join show up here.',
    sections: { now: 'Happening now', upcoming: 'Coming up', ending: 'Ending soon' },
    profile: 'Profile',
    create: 'Create a room',
    join: 'Join a room',
    guestCreateHint: 'Want to host?',
    loading: 'Loading rooms',
    loadFailed: 'Could not load your rooms.',
    retry: 'Try again',
    endsIn: (remaining: string) => `Ends in ${remaining}`,
    // UX3-A01: a Rooms row's last item, time, unread pill and Live tag.
    row: {
      noMessages: 'No messages yet',
      yesterday: 'Yesterday',
      live: 'Live',
      liveSpoken: 'live',
      unreadSpoken: (n: number) => `${n} unread`,
      endsIn: (remaining: string) => `ends in ${remaining}`,
      starts: (when: string) => `Starts ${when}`,
    },
  },
  rooms: {
    someone: 'Someone',
    ended: 'Ended',
    types: { sports: 'Sports', event: 'Event', waiting: 'Class', general: 'General' },
    errors: {
      invalid: 'This invite is invalid or the room has ended.',
      throttled: "Too many attempts. Try again in a few minutes, or scan the room's QR code to join.",
      full: 'This room is full.',
      account: 'Your sign-in is no longer valid. Please sign in again or continue as a new guest.',
    },
  },
  createRoom: {
    title: 'New room',
    nameLabel: 'Room name',
    namePlaceholder: 'Sunset Run',
    typeLabel: 'Room type',
    // Spec 11 A5/A7: Luma-style Start ⋮ End. End is when the room closes and is deleted.
    whenLabel: 'Start and end',
    endLabel: 'End',
    endHint: 'At End the room closes and everything in it is deleted.',
    presetsLabel: 'Room length',
    presetLabel: (hours: number) => (hours < 24 ? `${hours} hours` : hours === 24 ? '1 day' : `${hours / 24} days`),
    more: 'More',
    moreTitle: 'Room length',
    moreUpgrade: 'Longer rooms come with Plus.',
    cancel: 'Cancel',
    endTooSoon: 'The end time must be at least 5 minutes from now.',
    // UX2-24: the plan lapsed to Free after a longer End was picked; End snaps back to 2 days (ink2, not red).
    freeEndSnapped: 'Free rooms last up to 2 days.',
    endTooLong: (plus: boolean) => (plus ? 'Rooms last up to 7 days.' : 'Free rooms last up to 2 days. Plus rooms last up to 7.'),
    locationLabel: 'Allow location sharing',
    locationHint: 'Members still choose for themselves. Sharing starts only after you start the activity.',
    statusesLabel: 'Status options',
    statusesDefault: ['Resting', 'Giving up', 'Need water', 'Need help'] as const,
    statusesAdd: '+ Add',
    statusesHint: 'Emergency is always included.',
    submit: 'Create room',
    nameRequired: 'Enter a room name.',
    // Place and time unit (0026): optional meeting place and start time.
    placeLabel: 'Meeting place (optional)',
    placePlaceholder: 'North Gate, Golden Gate Park',
    findOnMap: 'Find on map',
    finding: 'Finding…',
    notFound: 'No match on the map. The place name still works without a pin.',
    findFailed: "Couldn't search the map. The place name still works without a pin.",
    pinHint: 'Tap the map to move the pin.',
    removePin: 'Remove pin',
    addStartTime: 'Add start time',
    // UX2-73: the Start pill before a start time is set.
    startNow: 'Now',
    startTimeLabel: 'Start',
    removeStartTime: 'Remove start time',
    startAfterClose: 'The start time must be before the room closes.',
    startTooEarly: 'The start time is too far in the past.',
    startMoved: 'The start time moved to fit the new end time.',
    // Spec 11 B: capacity.
    capacityLabel: 'People',
    fewerPeople: 'Fewer people',
    morePeople: 'More people',
    capacityHintFree: (free: number, plus: number) => `Free rooms hold up to ${free}. Plus up to ${plus}.`,
    capacityHintPlus: (plus: number) => `Plus rooms hold up to ${plus}.`,
    // Capacity option B: shown under the stepper at the plan max.
    // UX2-131: under the stepper when a typed count was clamped down to the plan max.
    clampFree: (n: number) => `Set to ${n}, the Free max.`,
    clampPlus: (n: number) => `Set to ${n}, the max.`,
    seePlus: 'See Plus',
    capacityAtMax: (n: number, plus: boolean) => `${n} · ${plus ? 'Plus' : 'Free'} max`,
    // Spec 11 D: public rooms in Open chat.
    visibilityLabel: 'Who can join',
    private: 'Private',
    public: 'Public',
    privateHint: 'Only people with the code or QR can join.',
    publicHint: 'Anyone can find this room in Open chat and join without a code.',
    iconLabel: 'Icon',
    // UX2-42: what VoiceOver reads for each room icon chip (never the stored slug).
    iconNames: {
      run: 'Run icon',
      bike: 'Bike icon',
      ball: 'Ball icon',
      coffee: 'Coffee icon',
      meal: 'Meal icon',
      party: 'Party icon',
      music: 'Music icon',
      book: 'Book icon',
      work: 'Work icon',
      beach: 'Beach icon',
      chat: 'Chat icon',
      pin: 'Pin icon',
    } as Record<string, string>,
    areaPlaceholder: 'Area, e.g. Echo Park',
    areaUsePin: (area: string) => `Use ${area}`,
    areaMissing: 'Add an area so people nearby can find this room.',
  },
  // Spec 11 D: the Open chat section on Rooms.
  openChat: {
    section: 'Open chat',
    today: 'today',
    tomorrow: 'tomorrow',
    until: (when: string) => `until ${when}`,
    filledUp: (name: string) => `${name} just filled up.`,
    closedNow: (name: string) => `${name} is no longer open.`,
    loadFailed: "Couldn't load open rooms.",
    count: (n: number, max: number) => `${n}/${max}`,
    joined: 'Joined',
    gone: 'This room is no longer open.',
    joinHint: 'Joins without a code',
    dailyLimit: 'You can create up to 5 public rooms per day.',
  },
  // Q 02.03
  join: {
    title: 'Find your room',
    subtitle: 'Enter the five-digit code from your host.',
    codeLabel: '5-digit room code',
    scan: 'Scan QR code',
    codeInvalid: 'Enter the 5 digits from the host.',
    // UX3-A10: the code is checked on the 5th digit; a wrong code shows this red line under the boxes.
    checking: 'Checking code',
    noRoom: 'No room with that code. Check with your host.',
  },
  // Q 08.01
  scan: {
    title: 'Scan an invite',
    subtitle: "Point the camera at your host's QR code.",
    enterCode: 'Enter code instead',
    permissionHint: 'Qrew uses the camera only to read the room QR code.',
    allow: 'Allow camera',
    openSettings: 'Open Settings',
    notInvite: 'That QR code is not a Qrew invite.',
  },
  preview: {
    // UX2-42: the spinner's VoiceOver label.
    loading: 'Loading invite',
    title: 'Join room',
    members: (count: number, max: number) => `${count} of ${max} members`,
    endsAt: (when: string) => `Ends ${when}`,
    endsSoon: 'This room ends within 24 hours. Photos and files are deleted when it ends.',
    join: 'Join the room',
    open: 'Open room',
    alreadyMember: 'You are already in this room.',
    // Q 07.03
    unavailableTitle: 'Invite unavailable',
    enterCode: 'Enter a room code',
  },
  // Place and time unit (Q 01.04): map, place + Open in Maps, date and time. Shown only when set.
  placeTime: {
    mapCaption: 'Meeting point preview',
    openInMaps: 'Open in Maps',
    // Q 08.02
    sheetTitle: 'Open meeting location',
    openApple: 'Open in Apple Maps',
    openGoogle: 'Open in Google Maps',
    cancel: 'Cancel',
    localTime: 'Local time',
    starts: (when: string) => `Starts ${when}`,
  },
  room: {
    invite: 'Invite',
    endsIn: (remaining: string) => `Ends in ${remaining}`,
    endsAt: (when: string) => `Ends ${when}`,
    // Qrew unit 3 (Q 03.01): "Ends today at 10:00 PM" under the room name in chat.
    endsOn: (day: 'today' | 'tomorrow' | 'later', date: string, time: string) =>
      day === 'today' ? `Ends today at ${time}` : day === 'tomorrow' ? `Ends tomorrow at ${time}` : `Ends ${date} at ${time}`,
    reminderTitle: 'Room ends soon',
    // #9: one compact line in chat; the full note is in Info.
    endsSoonLine: 'Room ends soon · photos and files are deleted',
    // UX2-128: under the Ends card when notifications are denied.
    remindersOff: "Reminders are off, so you won't get a heads-up before this room ends.",
    openSettings: 'Open Settings',
    endsSoonInfo: "Photos, files and chat are deleted when the room ends, or 30 minutes after the host ends it early. Download anything you'd like to keep.",
    reminderBody: (name: string, remaining: string) =>
      `${name} disappears in ${remaining}. Download any photos and files you'd like to keep.`,
    members: 'Members',
    membersCount: (n: number) => `Members (${n})`,
    info: 'Info',
    host: 'Host',
    you: 'You',
    leave: 'Leave room',
    leaveConfirmTitle: 'Leave this room?',
    leaveConfirmBody: 'You will lose access to its chat and photos. You can rejoin with the invite while the room is open.',
    end: 'End room for everyone',
    // Qrew unit 5 (Q 03.03): Room info cards.
    infoSubtitle: (isHost: boolean) => (isHost ? 'Room info · Host' : 'Room info'),
    people: (n: number) => (n === 1 ? '1 person' : `${n} people`),
    arrived: (n: number) => `${n} arrived`,
    // UX2-15: the people row once the room is at its member limit (ink2).
    full: (n: number, max: number) => `${n} of ${max} · Full`,
    viewParticipants: 'View participants',
    hideParticipants: 'Hide participants',
    statusOptions: 'Status options',
    editStatusOptions: 'Edit status options',
    doneEditingStatus: 'Done editing statuses',
    cancel: 'Cancel',
    gone: 'This room has ended.',
    goneHint: 'It expired, was ended by the host, or you left it.',
    reminderGoneHint:
      'The room from your reminder has ended. Its messages, photos, and files were deleted from the server. Anything you already saved to your device is still there.',
    back: 'Back',
    backToRooms: 'Back to rooms',
    openFailedTitle: "Couldn't open this room",
    openFailedBody: 'Check your connection and try again.',
    // Qrew unit 5 (Q 06.04): the shared ended screen. closedAt only when the client knows the time (lib/room-ended).
    endedTitle: 'This room has ended',
    closedAt: (name: string, when: string) => `${name} closed at ${when}.`,
    savedStay: 'Saved originals stay on your device.',
  },
  statusEditor: {
    title: 'Statuses',
    emergencyFixed: 'Always included',
    hostHint: 'Members pick one of these as their status. Emergency is always included and can’t be changed.',
    memberHint: 'The host sets these. Choose yours with Status in the room chat.',
    rowLabel: (n: number) => `Status ${n}`,
    placeholder: 'Status name',
    remove: (label: string) => `Remove ${label || 'empty status'}`,
    add: 'Add status',
    save: 'Save statuses',
    saved: 'Statuses saved.',
    loadError: 'Statuses could not be loaded.',
    tooLong: (label: string, max: number) => `“${label}” is longer than ${max} characters.`,
    emergency: 'Emergency is always included. Use a different name.',
    duplicate: (label: string) => `“${label}” is listed twice.`,
    removeConfirmTitle: 'Remove statuses?',
    removeConfirmBody: (labels: string) =>
      `${labels} will be removed. Members who chose one of these will have no status until they pick another.`,
    removeConfirm: 'Save',
    cancel: 'Cancel',
  },
  face: {
    // UX2-66: 'Mine' (I shared) and 'Me' read alike; the chip says 'Of me' (VoiceOver: title, 'Photos of me').
    filter: 'Of me',
    title: 'Photos of me',
    consentTitle: 'Find photos of you in this room',
    consentPoints: [
      'You add one reference photo of your face. It is used only in this room and is never shown in the shared gallery.',
      'Photos in this room (not videos) are compared with it by an external face-matching service (Amazon Rekognition).',
      'Results are estimates and can be wrong. You can hide any photo with “Not me”.',
      'Your reference and results are deleted from the server when you stop or leave the room. Otherwise they are deleted when the room ends, or 30 minutes after the host ends it early.',
      'This is optional. Everything else in the room works without it.',
    ],
    takePhoto: 'Take photo',
    choosePhoto: 'Choose from library',
    agree: 'Agree and save',
    chooseFirst: 'Take or choose a photo of your face first.',
    cameraDenied: 'Camera access is off. Turn it on in Settings, or choose a photo from your library.',
    cameraUnavailable: 'The camera is not available on this device. Choose a photo from your library instead.',
    saving: 'Saving your reference…',
    referenceTitle: 'Your reference photo',
    // UX2-81: the enrolled photo failed to load.
    referenceFailed: "Couldn't load your face photo.",
    tryAgain: 'Try again',
    referenceHint: 'Only you can see this. It is used only in this room.',
    // UX2-68: the row under the reference photo.
    matchCount: (n: number) => (n === 1 ? '1 photo of you in this room' : `${n} photos of you in this room`),
    noMatchesYet: 'No photos of you yet.',
    replace: 'Replace photo',
    stop: 'Stop and remove',
    stopTitle: 'Stop finding photos of you?',
    stopBody: 'Your reference photo and all results for this room are deleted from the server.',
    stopConfirm: 'Stop and remove',
    cancel: 'Cancel',
    setUp: 'Set up photos of me',
    manage: 'Manage',
    // Qrew unit 5 (Q 06.01): the Me filter before setup.
    intro: 'Find your photos in this room.',
    introMeta: 'Optional · One reference photo',
    // Qrew unit 5 (Q 06.02): the review screen. The consent points above stay in full on it (not Q's short text).
    reviewTitle: 'Review your reference',
    // UX P2-2: before a photo is picked; two short lines, the full consent points behind `details`.
    addTitle: 'Add a photo of you',
    consentShort: [
      'Your photo is used only in this room to find photos of you. It is never shown in the gallery.',
      'It is deleted when you stop, leave, or the room ends.',
    ],
    details: 'Details ›',
    hideDetails: 'Hide details',
    reviewSubtitle: 'Check that your face is clearly visible.',
    pickPhoto: 'Choose a photo',
    chooseAnother: 'Choose another',
    pickPhotoHint: 'Takes or chooses a photo of your face',
    noPhotoYet: 'No photo chosen yet',
    // UX2-41: no "draft" wording.
    disabled: 'Matching is off.',
    runError: (message: string) => `Photos could not be checked: ${message}`,
    checking: (n: number) => `${n} ${n === 1 ? 'photo is' : 'photos are'} still being checked.`,
    failed: (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'} could not be checked.`,
    empty: 'No photos of you yet.',
    emptyHint: 'New photos in this room are checked when you open this view.',
    likelyYou: 'Likely you',
    notMe: 'Not me',
    notMeTitle: 'Hide this photo from Photos of me?',
    notMeBody: 'The photo stays in the room. It is only removed from your Photos of me.',
    loadError: 'Photos of me could not be loaded.',
  },
  reminder: {
    title: 'Room ends in 24 hours',
    body: (name: string) => `${name} disappears tomorrow. Download any photos and files you'd like to keep.`,
    // G6b: rooms under 24 h are reminded in their last hour.
    titleLastHour: 'Room ends in 1 hour',
    bodyLastHour: (name: string) => `${name} disappears in 1 hour. Download any photos and files you'd like to keep.`,
  },
  chat: {
    // UX2-130 (R-C8): the in-chat reminder card, the only place the app asks for notifications.
    reminderCardTitle: 'Get a reminder a day before this room ends?',
    reminderCardTurnOn: 'Turn on',
    reminderCardNotNow: 'Not now',
    // UX3-B09 (S3): one ink check per message; long-press menu, double-tap, the pill and its "Checked by" sheet.
    checkAdd: 'Got it',
    checkRemove: 'Remove check',
    copy: 'Copy',
    checkCount: (n: number) => (n === 1 ? '1 check' : `${n} checks`),
    checkValue: (n: number, mine: boolean) => `${n === 1 ? '1 check' : `${n} checks`}${mine ? ', checked by you' : ''}`,
    checkedByTitle: 'Checked by',
    checkedByHint: 'Shows who checked this',
    checkFailed: 'Your check could not be saved. Try again.',
    // Qrew unit 3 (Q 03.01): nav title and the room's tab row.
    title: 'Chat',
    tabs: 'Room sections',
    tabChat: 'Chat',
    placeholder: 'Message the room',
    send: 'Send',
    emptyTitle: 'No messages yet',
    empty: 'Say hello to the room.',
    loadError: 'Messages could not be loaded.',
    reconnecting: 'Reconnecting…',
    sending: 'Sending…',
    failed: 'Not sent. Tap to retry.',
    // UX2-41: the failed-send alert.
    failedTitle: 'Message not sent',
    retry: 'Try again',
    discard: 'Delete',
    formerMember: 'Former member',
    // Grace: the host's row is not readable, but the room's host_id is (src/lib/member-name.ts).
    host: 'Host',
    you: 'You',
    // #8: the uploader's line; `body` is the stored "shared 3 photos".
    shared: (who: string, body: string) => `${who} ${body}`,
    sharedFallback: 'shared a photo or file',
    // UX3-B01: the header title block opens Room info.
    headerHint: 'Opens room info',
    // UX3-B04: expands a collapsed run of system lines.
    showLines: 'Show',
    // V3 P2: the collapsed run on one line with a chevron; VoiceOver reads "Sora is OK now, 18 more. Show."
    showLinesRun: (summary: string) => `${summary} ›`,
    showLinesLabel: (summary: string) => {
      const i = summary.lastIndexOf(' · ');
      return `${i < 0 ? summary : `${summary.slice(0, i)}, ${summary.slice(i + 3)}`}. Show.`;
    },
    // UX3-B01: the header's second line, joined with " · ".
    header: {
      people: (n: number) => (n === 1 ? '1 person' : `${n} people`),
      here: (n: number) => `${n} here`,
      endsToday: (time: string) => `ends ${time}`,
      endsTomorrow: (time: string) => `ends tomorrow ${time}`,
      endsOn: (date: string) => `ends ${date}`,
    },
    // UX3-B04: day separators and collapsed system-line runs.
    timeline: {
      today: 'Today',
      yesterday: 'Yesterday',
      and: (a: string, b: string) => `${a} and ${b}`,
      others: (n: number) => `${n} others`,
      joined: (names: string) => `${names} joined`,
      emergencyFlips: (name: string, ok: boolean) => (ok ? `${name} set Emergency and is OK now` : `${name} set Emergency`),
      times: (n: number) => `${n} times`,
      more: (n: number) => `${n} more`,
      okNow: (name: string) => `${name} is OK now`,
    },
    openPhotosHint: 'Opens Photos',
    // UX P1-2: one short grey line each; a tappable line ends in " ›".
    emergencySet: (name: string) => `${name} set Emergency`,
    activityStarted: 'Activity started',
    openMapLink: 'Open Map',
    openMapHint: 'Opens Map',
    // Spec 11 A9: the header bell.
    notices: 'Notices',
    noticesA11y: (unread: number) => (unread > 0 ? `Notices, ${unread} new` : 'Notices'),
    noNotices: 'Nothing new. Room notices show up here.',
    emergencyNotice: (name: string) => `${name} needs help`,
    // Spec 11 A12: the header gear.
    settings: 'Room settings',
    // Spec 11 A11: the "+" panel left of the composer.
    more: 'More',
    moreClose: 'Close',
    // UX2-74: before the intro is saved the "+" is the way to status, arrival and Emergency.
    moreGated: 'More: status, arrival, Emergency',
    arrivedTile: 'Arrived',
    statusTile: 'Set status',
    // Spec 11 A13: the host's important message pinned on top.
    pinnedExpand: 'Show the whole notice',
    pinnedCollapse: 'Fold the notice',
    pinnedOpen: 'Show in chat',
    pinnedDismiss: 'Hide the notice',
    // Spec 11 A14: the tag next to the host's name.
    hostTag: 'Host',
  },
  media: {
    // UX2-37: the viewer's photo failed to load.
    photoLoadFailed: "Couldn't load this photo.",
    title: 'Photos & files',
    headerLink: 'Photos',
    all: 'All',
    mine: 'Mine',
    others: 'Others',
    add: 'Add',
    addTakePhoto: 'Take photo',
    addPhotos: 'Photos and videos',
    addFile: 'File',
    cameraDenied: 'Camera access is off. Turn it on in Settings to take photos for this room.',
    cameraUnavailable: 'The camera is not available on this device.',
    cameraTitle: "Can't take photo",
    cancel: 'Cancel',
    // #7: one-time notice before the first photo/video add. Wording approved by the human on 2026-11-07 (via qa).
    originalsNoticeTitle: 'Photos are shared as originals',
    originalsNoticeBody:
      'Photos and videos keep their full quality and any location saved in them. Everyone in this room can see and download them.',
    originalsNoticeContinue: 'Continue',
    empty: 'Nothing shared yet.',
    emptyMine: 'You have not shared anything yet.',
    emptyOthers: 'Nobody else has shared anything yet.',
    emptyHint: 'Photos, videos, and files are shared at original quality and deleted when the room ends, or 30 minutes after the host ends it early.',
    loadError: 'Photos and files could not be loaded.',
    refreshFailed: "Couldn't refresh. Pull to try again.",
    uploading: (pct: number) => `Uploading ${pct}%`,
    uploadFailed: 'Upload failed',
    waiting: 'Waiting to upload',
    cancelUpload: 'Cancel upload',
    cancelUploadTitle: 'Cancel this upload?',
    cancelUploadBody: (name: string) => `${name} will not be shared. You can add it again later.`,
    keepUploading: 'Keep uploading',
    headerLinkUploading: (n: number) => `Photos ↑${n}`,
    // UX2-41: was 'Photos !'.
    headerLinkFailed: (n: number) => (n === 1 ? '1 upload failed' : `${n} uploads failed`),
    headerLinkA11y: (pending: number, failed: number) =>
      [`Photos`, pending > 0 ? `${pending} uploading` : '', failed > 0 ? `${failed} failed` : ''].filter(Boolean).join(', '),
    emptyFile: 'The selected file is empty.',
    // Capacity option B (0033 PT507): the room's storage cap by the host's plan.
    roomStorageFull: 'This file is too big for the space left in this room. Smaller files may still fit.',
    // UX2-06 (pattern D): dead-end upload rows; no Retry.
    outOfSpace: 'Not enough space left in this room for this file.',
    outOfSpaceHint: 'Smaller files may still fit.',
    cantUpload: "This file can't be uploaded.",
    seePlus: 'See Plus',
    tooLarge: (limit: string, size: string) => `Files up to ${limit} can be shared. This one is ${size}.`,
    tooLargeTitle: 'Too large to share',
    tooLargeSkipped: (limit: string, list: string) =>
      `Files up to ${limit} each can be shared. Not added: ${list}. Shorter or trimmed videos usually fit.`,
    retry: 'Retry',
    dismiss: 'Remove',
    sharedBy: (name: string) => `Shared by ${name}`,
    more: 'More',
    you: 'You',
    download: 'Download original',
    downloading: (pct: number) => `Downloading ${pct}%`,
    savedToPhotos: 'Saved to Photos.',
    savedFile: 'Original saved.',
    verified: (size: string) => `Original verified (${size}).`,
    notFound: 'This item is no longer available.',
    removed: 'This item was removed.',
    backToPhotos: 'Back to Photos',
    photosOff: "Qrew can't save to Photos.",
    openSettings: 'Open Settings',
    video: 'Video',
    file: 'File',
    // Qrew unit 5 (Q 05.01-05.04, 06.03)
    photo: 'Photo',
    addButton: 'Add photos or files',
    addSheetTitle: 'Add to the room',
    addSheetTakePhoto: 'Take a photo',
    addSheetPhotos: 'Choose photos & videos',
    addSheetFiles: 'Browse files',
    filters: 'Show',
    originalsUntil: (day: 'today' | 'tomorrow' | 'later', date: string, time: string) =>
      day === 'today'
        ? `Originals available until ${time}.`
        : day === 'tomorrow'
          ? `Originals available until tomorrow at ${time}.`
          : `Originals available until ${date} at ${time}.`,
    closesIn: (min: number) => `Room closes in ${min} min`,
    saveBefore: (time: string) => `Save originals before ${time}.`,
    saveOriginal: 'Save original',
    share: 'Share',
    sharedByAge: (name: string, age: string) => `Shared by ${name} · ${age}`,
    /** A11y sweep: a grid tile for VoiceOver, "Photo by Mina, 2 min". */
    /** UX2-80: a grid tile whose preview failed to load. */
    previewUnavailable: (label: string) => `${label}, preview unavailable`,
    tileSpoken: (kind: string, name: string, age: string | null) =>
      `${kind === 'video' ? 'Video' : kind === 'file' ? 'File' : 'Photo'} by ${name}${age ? `, ${age}` : ''}`,
    savedTitle: 'Original saved',
    savedBody: 'It stays on your device after the room closes.',
    dismissSaved: 'Dismiss',
    closeSheet: 'Close',
    // Q 05.03: how long ago an item was shared ("Shared by Mia · 18 sec").
    age: (n: number, unit: 'sec' | 'min' | 'hr' | 'day') =>
      unit === 'day' ? `${n} ${n === 1 ? 'day' : 'days'}` : `${n} ${unit}`,
    // UX2-71: the Photo viewer line, matching "Last seen 2 h ago" ("Shared by Jun · 11 h ago").
    ageAgo: (n: number, unit: 'sec' | 'min' | 'hr' | 'day') =>
      `${unit === 'day' ? `${n} ${n === 1 ? 'day' : 'days'}` : `${n} ${unit === 'hr' ? 'h' : unit}`} ago`,
  },
  // Qrew unit 5 (Q 07.04): shown instead of an alert when camera access is off for Take a photo.
  cameraOff: {
    title: 'Camera access is off',
    body: 'Allow access in Settings to take a photo.',
    openSettings: 'Open Settings',
    chooseLibrary: 'Choose from library',
  },
  activity: {
    // UX2-05 (pattern E): the Emergency read failed; never shown as "no Emergency".
    readFailed: "Can't check for Emergencies. Try again.",
    readRetry: 'Try again',
    // C39 (UX2-126): the Emergency bar's location line before a presence read worked.
    checkingLocation: 'Checking location…',
    checkingLocationSpoken: 'Checking location.',
    locationFailed: "Couldn't check location",
    locationFailedSpoken: "Couldn't check location.",
    locationRetry: 'Try again',
    locationRetryHint: 'Double-tap to try again.',
    // UX2-107: the room channel is down (the last known Emergencies stay listed below), and a slow first read.
    offlineStale: "You're offline. Emergencies may not be up to date.",
    checking: 'Checking for Emergencies…',
    checkingSpoken: 'Checking for Emergencies.',
    // UX2-05b: the status picker when the status list failed to load.
    statusesFailed: "Couldn't load statuses.",
    // UX2-108: the picker while the first status read runs (spoken without the ellipsis).
    statusesLoading: 'Loading statuses…',
    statusesLoadingSpoken: 'Loading statuses.',
    emergencyTile: 'Emergency',
    emergencyTileA11y: 'Emergency, alerts everyone in the room',
    emergencyNotSent: 'Emergency not sent',
    arrived: 'Arrived',
    arrivedAt: (time: string) => `Arrived ${time}`,
    status: 'Status',
    statusValue: (label: string) => `Status: ${label}`,
    chooseStatus: 'Set your status',
    // Qrew unit 3 (Q 03.01, 04.03)
    setStatus: 'Set status',
    helpRequested: 'Help requested',
    waitingSeen: 'Waiting for someone to see it.',
    lastLocation: (age: string) => `Last location shared · ${age}`,
    noLocation: 'No location shared',
    // C37 (UX2-126): the location line on the expanded Emergency bar.
    openLastLocationAge: (age: string) => `Open last location · ${age}`,
    yourLastLocation: (age: string) => `Your last location · ${age}`,
    openLastLocation: 'Open last shared location',
    imOkNow: "I'm OK now",
    inEmergencyCaption: "You're in Emergency. Other statuses come back after you're OK.",
    // UX2-52 server guard (PT409 emergency_active): shown in the picker, which reopens in its Emergency layout.
    emergencyActiveError: "You're still in Emergency. Tap I'm OK now first.",
    unavailableInEmergency: (label: string) => `${label}, unavailable during Emergency`,
    clearStatus: 'Clear status',
    emergencyConfirmTitle: 'Send Emergency?',
    emergencyConfirmBody:
      'Everyone in this room gets an in-app alert. This does not contact emergency services or turn on location sharing.',
    sendEmergency: 'Send Emergency',
    emergencyFrom: (name: string) => `${name} needs help`,
    /** UX2-79: the member list is not known yet or failed to load. */
    emergencyFromUnknown: 'Emergency from someone in this room',
    myEmergency: 'Your Emergency is active',
    seenBy: (n: number, total: number) => `Seen by ${n} of ${total}`,
    /** #12: who has seen it, then the count ("Seen by Mina, Joon · 2 of 3"). */
    seenByNames: (who: string[], n: number, total: number) =>
      who.length > 0 ? `Seen by ${who.join(', ')} · ${n} of ${total}` : `Seen by ${n} of ${total}`,
    acknowledge: 'I see it',
    acknowledged: 'You saw this',
    // UX P0-1: the pinned bar and its collapsed 44 pt line.
    // UX2-126: the seen part on someone else's Emergency at 0; "Seen by n" while the member names are unknown.
    noOneSeen: 'No one has seen it yet.',
    seenByCount: (n: number) => `Seen by ${n}`,
    emergencyLine: (name: string) => `${name} · Emergency`,
    emergencyLineMine: 'You · Emergency',
    // V4 Map capsule: "**Sora** needs help · 2 on the way" (the name is bold, so it is a separate run).
    capsuleNeedsHelp: ' needs help',
    capsuleMine: 'You need help',
    // Emergency "On my way" (ux spec 2026-11-14; server 0040 posts the "<name> is on the way" chat line itself).
    onMyWay: 'On my way',
    cantCome: "Can't come",
    youOnWay: "You're on the way",
    onWayYou: 'You',
    onWayLineSuffix: (n: number) => ` · ${n} on the way`,
    onMyWayLabel: (name: string) => `On my way, tell ${name} you're coming`,
    cantComeLabel: (name: string) => `Can't come, tell ${name} you're not coming`,
    /** `who` is in order, "You" first; 3 or more name the first two. */
    onWayNames: (who: string[]) => {
      const verb = who.length === 1 && who[0] !== 'You' ? 'is' : 'are';
      if (who.length <= 2) return `${who.join(' and ')} ${verb} on the way`;
      return `${who[0]}, ${who[1]} and ${who.length - 2} more are on the way`;
    },
    onWayCount: (n: number) => `${n} on the way`,
    onWayFailed: "Couldn't send. Try again.",
    onWayRetry: 'Try again',
    openEmergency: 'Open',
    // UX2-30: three or more Emergencies in chat fold into one line until Show.
    emergencyCount: (n: number) => `${n} Emergencies`,
    showEmergencies: 'Show',
    hideEmergency: 'Hide',
    locationHint: (age: string) => `Opens the last shared location, ${age}`,
    imOk: "I'm OK",
    actionFailed: 'That did not go through. Check your connection and try again.',
  },
  // Pace maker (sports rooms, Map tab; spec 3). Cues are spoken when voice is available, else a vibration and the banner.
  pace: {
    title: 'Pace maker',
    switchHint: 'Qrewing coaches your pace on this phone from your shared location. Your pace history stays on this phone.',
    // UX2-95: matches the switch label (map.shareMine).
    needsSharing: 'Turn on Share my live location to use the pace maker.',
    // UX2-125: cues run only while Map is in front (background cues are a held product question).
    mapOnly: 'Cues play while Map is open.',
    // capacity B item 4: the pace maker follows your own plan, also in a Free host's room.
    plusOnly: 'Pace maker is part of Qrew Plus.',
    needsActivity: 'Cues start when the host starts the activity.',
    target: 'Target',
    targetUsual: (pace: string | null) => (pace ? `My usual pace (${pace} per km)` : 'My usual pace (no runs yet)'),
    targetPace: 'Target pace',
    targetTime: 'Time for distance',
    pacePlaceholder: 'e.g. 5:30',
    paceEmpty: 'Enter a target pace to save it.',
    timeEmpty: 'Enter a distance and a time to save them.',
    distancePlaceholder: 'km',
    distanceLabel: 'Distance in km',
    timePlaceholder: 'h:mm:ss',
    timeLabel: 'Target time',
    perKm: 'per km',
    save: 'Save target',
    saved: 'Target saved.',
    // UX2-120/121
    switchSaveFailed: 'Couldn’t save. Try again.',
    targetSaveFailed: 'Couldn’t save your target.',
    tryAgain: 'Try again',
    invalidPace: 'Enter a pace like 5:30.',
    invalidTime: 'Enter a distance in km and a time like 50:00 or 1:45:00.',
    noTarget: 'No target yet. Run once, or set a target pace.',
    // C14 sweep 7: no position yet, or location is off.
    findingLocation: 'Finding your location…',
    // UX2-122: a build without speech.
    noVoice: 'Voice cues aren’t available, so cues will vibrate.',
    // UX2-123: the history save failed twice.
    runNotSaved: 'Couldn’t save this run.',
    // UX2-118
    waitingConnection: 'Pace maker is waiting for a connection.',
    stillFinding: 'Still looking for GPS. Moving outside can help.',
    locationOff: 'Location is off for Qrew.',
    openSettings: 'Open Settings',
    // The recap's pace line (features/recap shows it under my part; spec 3.3).
    recap: (distanceM: number, moving: string, total: string, pace: string) =>
      `Pace maker: ${(distanceM / 1000).toFixed(2)} km, moving ${moving}, total ${total}, ${pace} per km`,
    stats: (distanceM: number, duration: string, pace: string | null) =>
      `${(distanceM / 1000).toFixed(2)} km · ${duration}${pace ? ` · ${pace} per km` : ''}`,
    // Spec 11 A19: big stats row (Strava/NRC: big numbers, small labels) and the target box.
    statKm: 'km',
    statMoving: 'Moving',
    statPace: 'Pace per km',
    segUsual: 'Usual',
    segPace: 'Pace',
    segTime: 'Time',
    targetNow: (pace: string | null) => (pace ? `${pace} per km` : 'Not set'),
    // UX P1-9: one target row (pace bar against a target tick) and an Edit sheet.
    targetRow: 'Target',
    targetRowValue: (pace: string | null) => (pace ? `${pace}/km` : 'not set'),
    targetBarA11y: (pace: string | null, target: string | null) =>
      `Target ${target ? `${target} per km` : 'not set'}. Your pace ${pace ? `${pace} per km` : 'not known yet'}.`,
    editTarget: 'Edit',
    editTargetA11y: 'Edit target',
    targetSheetTitle: 'Target',
    done: 'Done',
    // Cues (spoken when voice is available; otherwise a vibration and this banner).
    cueKm: (n: number, pace: string | null, target: string | null) =>
      `Kilometer ${n}${pace ? `: ${pace} per km` : ''}${target ? `, target ${target}` : ''}.`,
    cueSlow: (pace: string, target: string) => `Pick it up: ${pace} per km, target ${target}.`,
    cueFast: (pace: string, target: string) => `Ease off: ${pace} per km, target ${target}.`,
    cueGap: (gapM: number, pace: string) =>
      `Lead group ${gapM} meters ahead. Run ${pace} per km to catch them in 3 minutes.`,
    cueGapPickUp: (gapM: number) => `Lead group ${gapM} meters ahead, pick up the pace.`,
    cueGapKeep: (gapM: number) => `Lead group ${gapM} meters ahead. Too far to catch in 3 minutes: keep your pace.`,
    cueDismiss: 'Dismiss cue',
    stationaryTitle: "You've stopped for 3 minutes. Everything okay?",
    dismiss: 'Dismiss',
  },
  map: {
    title: 'Map',
    headerLink: 'Map',
    allowLocation: 'Allow location sharing',
    allowLocationHint: 'Members can choose to share their position while an activity is running. Turning this off ends the activity and removes all positions.',
    notAllowed: "The host hasn't turned on location sharing.",
    startActivity: 'Start activity',
    endActivity: 'End activity',
    endConfirmTitle: 'End the activity?',
    // UX2-22: turning sharing off with no activity running ends nothing, so the alert says what it does.
    stopSharingTitle: 'Stop sharing locations?',
    stopSharingBody: 'Members stop seeing each other on the map.',
    stopSharing: 'Stop sharing',
    activityActive: 'Activity running',
    activityIdle: 'No activity running',
    activityIdleHint: 'Positions appear only while the host runs an activity.',
    shareMine: 'Share my live location',
    /** P0 (ux): under the switch while I'm in Emergency with sharing off. */
    shareInEmergency: 'Turn it on so others can find you.',
    shareMineHint: 'Only while the app is open. Nobody can turn this on for you.',
    permissionDenied: 'Location access is off for Qrew. Turn it on in Settings to share.',
    openSettings: 'Open Settings',
    preciseOff: 'Precise location is off. Pace and arrival may be wrong.',
    reporter: {
      off: '',
      starting: 'Finding your position…',
      // Spec 11 A19: no line while sharing works (the switch already says it is on).
      sharing: '',
      'no-permission': 'Location access was turned off, so sharing stopped.',
      error: 'Could not send your position. Retrying…',
      refused: 'Sharing stopped because the activity or room settings changed.',
    },
    members: 'Sharing now',
    // V4: the sheet header's count, e.g. "3 of 5".
    sharingCount: (n: number, max: number) => `${n} of ${max}`,
    nobody: 'Nobody is sharing yet.',
    // UX2-85: before the first read that worked, and after a failed read with nobody on screen.
    presenceLoading: 'Checking who’s sharing…',
    presenceFailed: 'Couldn’t load who’s sharing.',
    tryAgain: 'Try again',
    // UX2-117: a refetch failed while rows were already on screen.
    presenceStale: 'Couldn’t refresh. Showing the last update.',
    // UX2-87: under the Share switch, for sharing and the pace maker.
    locationOffShare: 'Location is off for Qrew. Turn it on to share and use the pace maker.',
    // UX2-91
    actionFailedTitle: 'Didn’t go through',
    // UX2-89
    removeRoute: 'Remove route',
    removeRouteTitle: 'Remove the route?',
    removeRouteBody: 'Members won’t see it on the map.',
    remove: 'Remove',
    // UX2-86
    shareUnknown: 'Couldn’t check your sharing.',
    you: 'You',
    stale: (age: string) => `Last seen ${age}`,
    stalePin: 'stale',
    /** P0 (ux): the Emergency row in "Sharing now": "Needs help · 2 min ago" (last fix), or "Location off". */
    needsHelp: (age: string | null) => `Needs help · ${age ?? 'Location off'}`,
    /** P0 (ux) VoiceOver: "Sora, needs help, location off". */
    needsHelpSpoken: (name: string, age: string | null) => `${name}, needs help, ${age ?? 'location off'}`,
    emergencyPin: (name: string) => `${name} · help`,
    /** UX2-41 sweep: a pin for VoiceOver, "Mina, 2 min ago". */
    pinSpoken: (name: string, age: string | null) => (age ? `${name}, ${age} ago` : name),
    updated: (age: string) => `Updated ${age}`,
    // UX P1-9: each person's place relative to me; only a stale position shows its age.
    withYou: 'with you',
    behind: (meters: number) => `${(meters / 1000).toFixed(1)} km behind`,
    ahead: (meters: number) => `${(meters / 1000).toFixed(1)} km ahead`,
    away: (meters: number) => `${(meters / 1000).toFixed(1)} km away`,
    route: 'Route',
    /** #10: the route length label, e.g. "Route 5.2 km". */
    routeDistance: (km: string) => `Route ${km}`,
    drawRoute: 'Draw route',
    editRoute: 'Edit route',
    /** Unit 4 F2 (Q 04.01): the editor's pen toggle. */
    draw: 'Draw',
    saveRoute: 'Save route',
    penOnHint: 'The map is locked. Draw the route with your finger. Turn Draw off to move the map.',
    penOffHint: 'Move the map, then tap Draw to keep drawing.',
    penWait: 'Move the map a little, then tap Draw again.',
    penNorthUp: 'Turn the map flat with north up, then tap Draw again.',
    routeTooFar: (km: number) => `This route is over ${km} km, so it wasn't saved. Undo or Clear, then draw it again.`,
    undo: 'Undo',
    clear: 'Clear',
    done: 'Done',
    cancel: 'Cancel',
    routeTooLong: (max: number) => `A route can have up to ${max} points.`,
    recenter: 'Recenter',
    showMine: 'Show my location',
    showMineHint: 'Only on your phone. This does not share your location.',
    locating: 'Finding you…',
    locateDenied: 'Location access is off for Qrew.',
    locateDeniedSettings: 'Location access is off for Qrew. Turn it on in Settings to see yourself on the map.',
    locateUnavailable: 'Could not find your position. Try again.',
  },
  // Qrew unit 4 (Q 03.04): confirm screens. Each line states only what the server does (see lib/end-plan.ts
  // callers): set_activity_state('ended') removes all live positions and turns sharing off for every member and
  // touches no photos or the room's end time; end_room sets deleted_at and grace_until = now + 30 min: chat and every
  // room feature close at once; only the recap, Photos of me and downloads stay readable until grace ends, then the
  // room-janitor (every 5 minutes) deletes the room's rows and storage.
  endActivity: {
    title: 'End the activity?',
    body: 'Live location sharing stops for everyone.',
    roomOpenUntil: (day: 'today' | 'tomorrow' | 'later', date: string, time: string) =>
      day === 'today'
        ? `The room stays open until ${time}.`
        : day === 'tomorrow'
          ? `The room stays open until tomorrow at ${time}.`
          : `The room stays open until ${date} at ${time}.`,
    effects: 'Location off · Photos stay',
    effectsLabel: 'Location sharing turns off. Photos stay in the room.',
    confirm: 'End activity',
    confirmHint: 'Ends for everyone.',
    keep: 'Keep activity running',
    notRunning: 'The activity is not running.',
    notHost: 'Only the host can end the activity.',
    back: 'Back to map',
  },
  endRoom: {
    title: 'End the room?',
    body: 'The room closes now for everyone.',
    // Spec 7.4: the host's early end keeps the recap and photos for 30 minutes (human decision 2026-11-12 (b)).
    deleted:
      'Chat closes now. The recap and photos stay available for 30 minutes, then messages, photos and files are deleted from the server. Anything already saved to a phone stays there.',
    effects: 'Closes now · Deleted after 30 min',
    effectsLabel: 'The room closes now. The recap and photos stay for 30 minutes, then everything is deleted.',
    // Qrewing AI off (or unknown): no recap is written, so the copy names photos only.
    deletedNoRecap:
      'Chat closes now. Photos stay available for 30 minutes, then messages, photos and files are deleted from the server. Anything already saved to a phone stays there.',
    effectsLabelNoRecap: 'The room closes now. Photos stay for 30 minutes, then everything is deleted.',
    confirm: 'End room for everyone',
    confirmHint: 'Ends for everyone.',
    keep: 'Keep room open',
    notHost: 'Only the host can end the room.',
  },
  // UX2-114: the red line above End room, End activity and Leave while an Emergency is still open.
  emergencyOpen: {
    endRoomOne: (name: string) => `${name}'s Emergency is still open. Ending the room removes it for everyone.`,
    endActivityOne: (name: string) =>
      `${name}'s Emergency is still open. Ending the activity stops live location for everyone.`,
    many: (n: number) => `${n} Emergencies are still open.`,
    // ux C36: one open Emergency before (or without) the names: no layout jump when the name swaps in.
    endRoomNameless: 'An Emergency is still open. Ending the room removes it for everyone.',
    endActivityNameless: 'An Emergency is still open. Ending the activity stops live location for everyone.',
    leaveMine: "Your Emergency is still on. Tap I'm OK now first.",
    checkFailed: "Couldn't check for open Emergencies.",
    checking: 'Checking for Emergencies…',
    tryAgain: 'Try again',
    tryingAgain: 'Trying again',
  },
  invite: {
    title: 'Invite',
    done: 'Done',
    hint: 'Scan with the Qrew app, or enter the code.',
    // UX2-15: under the QR when the room is at its member limit.
    full: "This room is full. New people can't join.",
    code: 'Code',
    share: 'Share invite',
    copyCode: 'Copy code',
    copied: 'Copied',
    reissue: 'Reissue invite',
    reissueConfirmTitle: 'Reissue the invite?',
    reissueConfirmBody: 'The current QR code, link, and code stop working. People already in the room stay.',
    reissued: 'New invite created.',
    shareMessage: (name: string, code: string, url: string) =>
      `Join "${name}" on Qrew. Code: ${code}\n${url}`,
    qrLabel: 'Room invite QR code',
    // Qrew unit 5 (Q 02.04).
    heading: 'Invite your group',
    inviteCode: 'Invite code',
  },
  profile: {
    title: 'Profile',
    // UX2-42: the profile read failed.
    loadFailed: "Couldn't load your profile.",
    nameLabel: 'Display name',
    save: 'Save name',
    saved: 'Saved',
    chooseAvatar: 'Or choose a picture',
    /** UX2-63: the visible label above the name field (VoiceOver reads the field's own label). */
    nameHeading: 'Name',
    avatarOption: 'Picture',
    accountType: 'Account',
    becomeHost: 'Create account',
    guestHostRow: 'Create account',
    signOut: 'Log out',
    guestSignOutWarning:
      'Guests cannot log back in. Logging out leaves this guest profile behind for good.',
    signOutConfirmTitle: 'Log out?',
    signOutConfirmBody: 'You can log back in any time with your email and password.',
    guestSignOutConfirmTitle: 'Log out of this guest account?',
    guestSignOutConfirmBody:
      'You cannot log back in to this guest account. You lose your guest profile and access to every room you joined with it. To come back, you need a new invite. To keep it, add an email and password first.',
    signOutConfirmAction: 'Log out',
    language: 'Language',
    languageValue: 'English',
    photoLabel: 'Profile photo',
    addPhoto: 'Add photo',
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    deleteAccount: 'Delete account',
    deleteConfirmTitle: 'Delete your account?',
    deleteConfirmBody:
      'Your profile, your photos and videos, and your room memberships are deleted. Messages you sent stay without your name. This cannot be undone.',
    deleteConfirmHostBody:
      'Rooms you host end now for everyone, and all their content is deleted. Your profile, your photos and videos, and your room memberships are deleted. Messages you sent in other rooms stay without your name. This cannot be undone.',
    deleteConfirmAction: 'Delete',
    deleteCancel: 'Cancel',
    deleteFailed: 'Your account was not deleted. Check your connection and try again.',
    // Qrew unit 5 (Q 07.01).
    guestAccount: 'Guest on this phone',
    account: 'Account',
    editProfile: 'Edit profile',
    editProfileHint: 'Your photo and name are shown to people in your rooms.',
  },
  planPreview: {
    // C14: a Plus gate never guesses Free; offline with no cached plan it says so (shared by every Plus gate).
    offline: "Can't check your plan offline. Try again when you're back.",
    // UX2-88: Calendar and the pace card, with a Try again button.
    offlineRetry: "Can't check your plan offline.",
    tryAgain: 'Try again',
    /** capacity B item 4: the link from a personal Plus feature to the Plus intro. */
    seePlus: 'See Plus',
    // v2 paywall, built to docs/evidence/plus-page-mockup/v2.html (v2 approved by the human, relayed by qa).
    title: 'Qrew Plus',
    pill: 'Qrew Plus',
    close: 'Close',
    // Headline (hand font, ≤2 lines) and one sub line per preview (features/calendar/plus-intro.ts plusPitch).
    pitch: {
      diary: { heading: 'Every meetup,\na page in your diary', sub: 'Qrewing writes it for you when the room ends.' },
      chat: { heading: 'Your room,\nwith a helper', sub: 'Answers from the chat, asks the host when it isn’t sure.' },
      trip: { heading: 'Keep the whole\ntrip in one room', sub: 'Up to 7 days and 30 people. Free rooms stop at 2 days and 6.' },
    },
    // Sample content for the preview card (illustration, not real data).
    sample: {
      diaryTitle: 'Saturday Lake Loop',
      diaryDate: 'Nov 14',
      diaryLines: ['Ran the lake with Jun and Sora.', '6:00 first lap, then we pushed.', 'Pastries after. Good morning.'],
      ask: 'Where do we meet if it rains?',
      qrewing: 'Qrewing',
      asked: 'The chat doesn’t say yet. I asked Mina (host) for you.',
      answered: 'Mina: under the boathouse roof, same time.',
      endsAfter: 'Ends after',
      days: ['2 days', '5 days', '7 days'],
      people: 'People',
      peopleCount: '24',
      tripName: 'Big Sur trip',
      tripOpen: 'open until Fri',
      a11y: 'Example',
    },
    // One-line benefits, the same on the Free and the Plus page (UX2-64); odd-index parts are bold.
    lines: {
      ai: ['', 'Qrewing', ' in every room you host'],
      rooms: ['Rooms up to ', '30 people', ' and ', '7 days', ''],
      add: ['', 'Add with Qrewing', ': just say the plan'],
    },
    tryCta: 'Try Plus free',
    fine: 'Preview · no payment · ',
    seeIncluded: 'See what’s included',
    // "See what's included" sheet.
    compareTitle: 'Free vs Plus',
    free: 'Free',
    plus: 'Plus',
    compare: [
      { label: 'People per room', free: '6', plus: '30' },
      { label: 'Room length', free: '2 days', plus: '7 days' },
      { label: 'Qrewing in rooms', free: null, plus: true },
      { label: 'Add with Qrewing', free: null, plus: true },
      { label: 'Calendar diary', free: null, plus: true },
    ],
    alwaysFree: 'Always free: rooms, chat, original photos, Photos of me, map and arrival, Emergency, and your own calendar events.',
    tbdNote: 'Prices are not decided yet.',
    included: 'Included',
    notIncluded: 'Not included',
    done: 'Done',
    // Plus state.
    onHeading: 'You’re on Plus',
    onBadge: '✓ Preview on this account',
    offCta: 'Turn off Plus preview',
    offFine: 'Rooms you already made keep their settings.',
    profileLink: 'Plus plan preview',
    saveFailedTitle: 'Could not change your plan',
    saveFailedBody: 'Check your connection and try again.',
  },
  calendar: {
    title: 'Qrewing Calendar',
    open: 'Calendar',
    openLabel: 'Open Qrewing Calendar',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    add: 'Add event',
    ask: 'Add with Qrewing',
    // UX2-124
    loading: 'Loading calendar',
    loadFailed: 'Couldn’t load your calendar.',
    tryAgain: 'Try again',
    more: (n: number) => `+${n}`,
    // Calendar tiers (human FINAL 2026-11-13 PM).
    barLabel: (title: string, range: string, action: 'diary' | 'plus' | 'edit' | 'none') =>
      action === 'none'
        ? `${title}, ${range}`
        : `${title}, ${range}, ${action === 'diary' ? 'open diary' : action === 'plus' ? 'Plus feature' : 'edit event'}`,
    // UX2-39: a month with nothing on it.
    // C14 E: an empty month (the grid stays bare while the calendar loads).
    emptyMonth: 'Nothing planned this month.',
    moreLabel: (n: number, day: string) => `${n} more on ${day}`,
    diaryLater: 'Your diary appears after this room ends.',
    upsellCardTitle: 'The Qrewing diary is a Plus feature',
    upsellCardBody: 'Plus keeps a short diary of each room you were in. Try it with the Plus preview.',
    upsellSeePlus: 'See Plus',
    upsellClose: 'Not now',
    dayItemsTitle: (n: number) => (n === 1 ? '1 item' : `${n} items`),
    dayItemsKind: { room: 'Room', event: 'My event' },
    dayItemsClose: 'Done',
    diaryNone: 'No recap was saved for this room.',
    diaryClose: 'Close diary',
    newEvent: 'New event',
    editEvent: 'Edit event',
    titleLabel: 'Title',
    titlePlaceholder: 'e.g. Dinner with Jun',
    startLabel: 'Starts',
    endLabel: 'Ends',
    allDayLabel: 'All day',
    emojiLabel: 'Icon',
    save: 'Save event',
    delete: 'Delete event',
    deleteConfirm: 'Delete this event?',
    // C14: hidden states.
    loadingEvent: 'Loading event',
    eventGone: 'This event is no longer available.',
    backToCalendar: 'Back to Calendar',
    saveFailed: "Couldn't save. Try again.",
    deleteFailed: "Couldn't delete. Try again.",
    cancel: 'Cancel',
    problems: {
      title: 'Enter a title.',
      dates: 'Pick the dates.',
      order: 'The end is before the start.',
      span: 'An event can span at most a year.',
      emoji: 'Pick an emoji.',
    },
    askTitle: 'Add with Qrewing',
    askPlaceholder: 'e.g. Dinner with Jun next Friday',
    askSend: 'Add',
    askBusy: 'Qrewing is reading that…',
    askConfirm: 'Check the event, then save it.',
    askErrors: {
      unclear: "Qrewing couldn't tell the date. Try with a day, like \"next Friday\".",
      rate_limited: 'Too many requests. Try again in a little while.',
      // UX2-94
      network: "You're offline. Try again when you're back.",
      other: "Qrewing couldn't add that right now. You can add it yourself with Add event (+).",
    },
  },
  auth: {
    accountGone: 'Your previous account is no longer available, so you were signed out. Sign in again or continue as a guest.',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
    // Audit-2 rule E: the request never reached the server.
    offline: "You're offline. Try again when you're back.",
    tryAgain: 'Try again',
    // UX2-34 (ux C5): plain text for raw server refusals.
    ended: 'This room has ended.',
    notMember: "You're not in this room anymore.",
    notAllowed: "You don't have access to this anymore.",
    emailPasswordRequired: 'Enter an email and password.',
    nameEmpty: 'Name cannot be empty.',
    notSignedIn: 'You are signed out. Sign in and try again.',
    photoUnreadable: 'The photo could not be read.',
    fileGone: 'The selected file is no longer available. Choose it again.',
    downloadIncomplete: 'The download did not finish.',
    downloadMismatch: 'The downloaded file does not match the original. Try again.',
    photosPermission: 'Allow Qrew to add to Photos in Settings to save originals.',
  },
  // Spec 11 C: Qrewing question cards (relay to a person who can answer).
  questions: {
    title: 'Question cards',
    // UX2-11: a failed first load (pattern E).
    loadFailed: "Couldn't load questions.",
    tryAgain: 'Try again',
    tile: 'Questions',
    newQuestion: 'New question',
    waiting: (n: number) => `${n} questions waiting`,
    fromAsker: (name: string, q: string) => `${name} asked: ${q}`,
    answered: (name: string) => `${name} answered your question`,
    spoken: (name: string, q: string) => `Question from ${name}. ${q}`,
    heardSpoken: 'Got it. Check your answer on screen, then tap Send.',
    heardHint: 'Heard by voice. Check it, then send.',
    intro: "Qrewing couldn't answer these, so it asked you. Only the asker sees your answer unless you post it as a notice.",
    empty: 'No questions for you right now.',
    asker: (name: string) => `From ${name}`,
    answerLabel: 'Your answer',
    postAsNotice: 'Post as notice',
    postAsNoticeHint: 'Also pins your answer at the top of the chat for everyone.',
    send: 'Send answer',
    sent: 'Answer sent.',
    yourAnswers: 'You answered',
    noticeTooLong: 'A notice can be up to 1000 characters.',
    // Ask Qrewing, UX2-47: a question Qrewing passed on stays in its own thread.
    askedReply: (name: string) => `I couldn't find a clear answer, so I asked ${name}.`,
    askedWaiting: (name: string) => `Asked ${name} · waiting`,
    answerFrom: (name: string) => `${name} answered`,
    // UX2-04b: an answer to my question is mine to read on any plan; only asking Qrewing more is Plus.
    youAsked: (q: string) => `You asked: ${q}`,
    answerLine: (name: string, a: string) => `${name}: ${a}`,
    answeredLabel: (name: string, a: string) => `${name} answered your question: ${a}`,
    answerBy: (name: string, time: string) => `${name} · ${time}`,
    yourQuestion: 'Your question',
    askMoreIsPlus: 'Asking Qrewing more is part of Qrew Plus.',
    // UX2-109: the answer sheet before the card is in the cache (spoken without the ellipsis).
    answerLoading: 'Loading the answer…',
    answerLoadingSpoken: 'Loading the answer.',
    answerFailed: "Couldn't load the answer.",
    answerGone: 'This question is gone.',
    done: 'Done',
    noAnswer: (name: string) => `${name} has not answered yet. Ask in the room chat instead?`,
    askInChat: 'Ask in chat',
    movedToChat: 'You asked this in the room chat.',
    errors: {
      conflict: 'This question was already answered or moved to the chat.',
      too_early: 'Wait for the answer a little longer.',
      invalid: 'Write an answer first (up to 2000 characters).',
      not_allowed: 'This question is no longer available.',
      network: 'No connection. Try again.',
      failed: 'Something went wrong. Try again.',
    },
  },
  qrewing: {
    create: {
      aiLabel: 'Qrewing AI',
      aiHint: 'Qrewing flags key messages and writes the recap.',
      entryLabel: 'Ask attendees for entry info',
      entryHint: 'Attendees fill in a short intro (what they do, interests, links) before they chat.',
      aiSaveFailed: 'The room was created, but Qrewing AI could not be turned on. You can try again from Room info.',
      aiSaveFailedHint: 'Dismisses this note.',
      questionsTitle: 'Entry questions',
      questionsHint: 'Attendees answer these before they chat. You cannot change them after the first answer.',
      promptLabel: (n: number) => `Question ${n}`,
      promptPlaceholder: 'Your question',
      kindShort: 'Short answer',
      kindLong: 'Long answer',
      kindLinks: 'Links',
      required: 'Required',
      moveUp: (n: number) => `Move question ${n} up`,
      moveDown: (n: number) => `Move question ${n} down`,
      remove: (n: number) => `Remove question ${n}`,
      add: 'Add a question',
      promptRequired: (n: number) => `Question ${n} needs text.`,
      promptTooLong: (n: number, max: number) => `Question ${n} can be up to ${max} characters.`,
      tooManyQuestions: (max: number) => `Add up to ${max} questions.`,
      noQuestions: 'Add at least one question.',
      questionsLocked: 'Questions are locked after the first answer.',
      questionsSaveFailed: 'The room was created, but the entry questions could not be saved, so entry info is off for this room.',
    },
    disclosure: {
      title: 'Qrewing AI is on in this room',
      // UX P1-7: three short lines; the full text sits behind `more`.
      summary: [
        'Qrewing reads chat and entry info to flag key messages and write the recap.',
        'Host and @everyone messages are flagged without AI.',
        'Everything is deleted when the room ends.',
      ],
      more: 'How Qrewing uses your messages ›',
      less: 'Hide details',
      body: [
        'In this room, your messages and entry info are sent to Anthropic’s Claude to flag important messages, suggest people to meet and write a recap.',
        'Host messages and messages with @everyone, @all or @here are highlighted by simple rules in Qrew, without AI. Only other messages, and only from members who agreed, are sent to the AI.',
        'Qrew deletes them, along with everything Qrewing made from them, when the room ends, or 30 minutes after the host ends it early.',
        'If you choose Not now, your messages stay out of every Qrewing request. You can agree later from Room info.',
      ],
      agree: 'Agree',
      notNow: 'Not now',
      failed: 'Could not save your choice. Try again.',
      // UX2-112: Agree saved, but the read after it failed (or still shows no consent).
      turnOnFailed: "Couldn't turn on Qrewing AI. Try again.",
    },
    ask: {
      // UX3-B05: the composer's Qrewing button.
      composerLabel: 'Qrewing',
      composerHint: 'Opens Qrewing AI.',
      // UX2-129: not_member alert before the screen closes.
      notMemberTitle: "You're not in this room anymore",
      notMemberMessage: "The room ended or you left it. Your question wasn't sent.",
      notMemberOk: 'OK',
      done: 'Done',
      doneLabel: 'Close Ask Qrewing',
      title: 'Ask Qrewing',
      intro: 'Only you see these questions and answers. They stay on this phone and are deleted when the room ends or you leave.',
      empty: 'Ask about this room: the plan, the route, or what people said in the chat.',
      placeholder: 'Ask a question',
      send: 'Send',
      thinking: 'Qrewing is thinking…',
      you: 'You',
      bot: 'Qrewing',
      reviewConsent: 'Review Qrewing AI',
      // UX2-10: the daily cap is a dead end (ink2, Send off); the burst limit is a fixable error.
      limitReached: "You've used today's questions. Ask again tomorrow.",
      rateLimited: 'Too many questions at once. Try again in a minute.',
      // UX2-04: a Free asker whose ask came back plan_limit (402); See Plus takes the composer's place.
      plusTitle: 'Ask Qrewing about this room',
      plusBody: "Qrewing answers from the chat and the plan. It's part of Qrew Plus.",
      seePlusHint: 'Opens the Qrew Plus page',
    },
    entry: {
      title: 'Introduce yourself',
      // UX P1-1: the card in the composer's place while the chat is read-only.
      // UX2-74: one line beside Add my info.
      chatPrompt: 'Add your intro to chat.',
      addMyInfo: 'Add my info',
      // UX2-138: short; Room info explains the 30-minute grace.
      intro: "Everyone in this room can see your intro. It's deleted when the room ends.",
      linksNote: 'Links are shown to attendees only. Qrewing does not open them.',
      save: 'Save',
      tooLong: (field: string, max: number) => `${field} can be up to ${max} characters.`,
      linkInvalid: 'Each link must start with https:// and be up to 200 characters.',
      tooManyLinks: 'Add up to 3 links.',
      requiredMark: 'Required',
      answerRequired: (prompt: string) => `Answer “${prompt}” to continue.`,
      linkPlaceholderN: (n: number) => `https://… (link ${n})`,
      noQuestions: 'No intro needed here',
      noQuestionsBody:
        'The host did not add entry questions to this room, so there is nothing to fill in. Entry questions can only be set when a room is created.',
      questionsLoadFailed: 'Could not load this room’s questions. Check your connection and try again.',
      loadFailed: 'Could not load your entry info. Check your connection and try again.',
      saveFailed: 'Could not save your entry info. Try again.',
      retry: 'Try again',
      discardTitle: 'Discard your entry info?',
      discardBody: 'What you typed has not been saved.',
      discard: 'Discard',
      keepEditing: 'Keep editing',
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
      /** UX2-01 / UX2-03: the subtitle on a Plus-only row for a Free user (the tap opens the Plus page). */
      partOfPlus: 'Part of Qrew Plus',
      loadFailed: 'Could not load Qrewing settings. Try again.',
      saveFailed: 'Could not save this change. Try again.',
      retry: 'Try again',
    },
    mute: {
      label: 'Mute small talk',
      on: 'Showing important messages',
      hidden: (n: number) => (n === 1 ? '1 message hidden' : `${n} messages hidden`),
      showAll: 'Show',
      banner: (reason: string) => `Important: ${reason}`,
      mentioned: 'You were mentioned',
      dismiss: 'Dismiss',
      unavailable: 'Qrewing is not available right now. All messages are shown.',
      saveFailed: 'Could not change Mute small talk. Try again.',
    },
    people: {
      title: 'People to meet',
      // UX2-129: not_member alert before the screen closes.
      notMemberTitle: "You're not in this room anymore",
      notMemberMessage: 'The room ended or you left it.',
      notMemberOk: 'OK',
      refresh: 'Refresh',
      loading: 'Qrewing is reading entry info…',
      emptyTitle: 'No suggestions yet',
      empty: 'No one else has shared entry info yet. Check back after more people join.',
      noQuestionsTitle: 'No intros in this room',
      noQuestions: "The host didn't add entry questions, so Qrewing can't suggest people to meet here.",
      // UX2-137: the host sees it about themselves.
      noQuestionsHost: "You didn't add entry questions, so Qrewing can't suggest people to meet here.",
      noEntryTitle: 'Tell Qrewing about you',
      noEntry: 'Qrewing suggests people from the entry info members share. Add yours to see who to meet.',
      stale: 'Showing the last list. A new one is available in a few minutes.',
      pending: 'Qrewing is still finding people to meet.',
      pendingFinal: 'Qrewing is still finding people to meet. Tap Refresh to check again.',
      updating: 'Showing the last list while Qrewing updates it.',
      updatingFinal: 'Showing the last list. Tap Refresh to check again.',
      updateFailed: 'Could not update the list. Tap Refresh to try again.',
      // UX2-49: the no-consent empty state says what the screen is for, then what to do.
      notConsented: 'Qrewing suggests people here you might get along with. Agree to Qrewing AI first.',
      // UX2-01: plan and consent gates are calm empty states, not errors.
      plusTitle: 'Find who to meet',
      plus: "Qrewing suggests people from the entry info members share. It's part of Qrew Plus.",
      seePlusHint: 'Opens the Qrew Plus page',
      consentTitle: 'Find who to meet',
      agree: 'Agree',
      // UX2-09: dead ends (pattern D), neutral with Back instead of a red Refresh.
      off: 'Qrewing is off in this room.',
      unavailable: "Qrewing isn't available right now.",
      back: 'Back',
    },
    recap: {
      title: 'Recap',
      none: 'No recap was saved for this room.',
      pending: 'Qrewing is still writing the recap.',
      offline: 'Could not get the recap. Check your connection.',
      // UX2-82: the card's read failed.
      loadFailed: "Couldn't load the recap.",
      loadOffline: "You're offline. Try again when you're back.",
      retry: 'Try again',
      you: 'You in this room',
      messages: (n: number) => (n === 1 ? '1 message sent' : `${n} messages sent`),
      media: (n: number) => (n === 1 ? '1 photo or file shared' : `${n} photos and files shared`),
      photosOfMe: (n: number) => (n === 1 ? '1 photo of you' : `${n} photos of you`),
      arrived: (time: string) => `Arrived at ${time}`,
      savedHere: 'Saved on this phone only.',
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
      not_consented: 'Agree to Qrewing AI in this room first.',
      ask_limit: 'You have asked Qrewing a lot today. Try again later.',
      unclear: "Qrewing couldn't understand that. Try saying it another way.",
      rate_limited: 'Too many requests. Try again in a little while.',
      plan_limit: 'This needs Qrew Plus.',
      ai_failed: 'Qrewing could not finish this. Try again.',
      network: 'No connection. Try again.',
    },
  },
} as const;
