import { en } from '@/i18n/en';
import { CONNECT_APP_NAMES, type ConnectErrorKind } from '@/lib/connect-plan';

/** Connect copy lives in en.connect (team rule); this alias keeps the feature's call sites short. */
export const connectCopy = en.connect;

// Compile-time checks: every error kind has copy, and en's app labels match connect-plan.
connectCopy.errors satisfies Record<ConnectErrorKind, string>;
CONNECT_APP_NAMES satisfies Record<Parameters<typeof connectCopy.appName>[0], string>;
