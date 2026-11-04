// UI copy is kept here so it can be translated later. English is the default.
export const en = {
  appName: 'Moment',
  welcome: {
    tagline: 'Temporary rooms for the people you are with right now.',
    joinAsGuest: 'Continue as guest',
    guestHint: 'Join a room with a QR or code. No sign-up needed.',
    hostSignIn: 'Host: Log in',
    hostSignUp: 'Host: Sign up',
  },
  guest: {
    title: 'Continue as guest',
    nameLabel: 'Your name',
    namePlaceholder: 'How others in the room see you',
    submit: 'Continue',
  },
  signIn: {
    title: 'Host log in',
    submit: 'Log in',
  },
  signUp: {
    title: 'Create a host account',
    submit: 'Sign up',
    hint: 'A host account is needed to create rooms. Joining rooms does not need one.',
    checkEmail: 'Check your email to confirm the account, then log in.',
  },
  upgrade: {
    title: 'Become a host',
    hint: 'Add an email and password to this guest profile. Your rooms stay as they are.',
    submit: 'Create host account',
  },
  fields: {
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 6 characters',
    name: 'Display name',
  },
  home: {
    title: 'Rooms',
    empty: 'No rooms yet.',
    emptyHint: 'Room creation and joining arrive in the next checkpoint.',
    signedInAs: (name: string, kind: string) => `Signed in as ${name} (${kind})`,
    profile: 'Profile',
  },
  profile: {
    title: 'Profile',
    nameLabel: 'Display name',
    save: 'Save name',
    saved: 'Saved',
    accountType: 'Account',
    guest: 'Guest',
    host: 'Host',
    becomeHost: 'Become a host',
    signOut: 'Log out',
    guestSignOutWarning:
      'Guests cannot log back in. Logging out leaves this guest profile behind for good.',
    language: 'Language',
    languageValue: 'English',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
    emailPasswordRequired: 'Enter an email and password.',
  },
} as const;
