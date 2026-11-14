# Accessibility inventory: pressables (2026-11-14)

Source: `mobile/src` at main `315fa2a`. Inventory only; no source was changed. ux decides what changes.

Scope: 112 `<Pressable>` and 99 `<Button>` (shared `components/ui.tsx`) uses. No `TouchableOpacity`/`TouchableHighlight` in the app. Method: a script read every `<Pressable>` opening tag and body, checking `accessibilityLabel`, `accessibilityRole` (including spreads), a readable `<Text>` child and an icon child (`SymbolView`, `Image`, `InkIcon`, `ActivityIndicator`). Each flagged site was then read by hand. Not checked on a device with VoiceOver.

## A. Missing label and no readable Text child

None outright. Two sites have no `accessibilityLabel` and no direct `<Text>`, but their child component renders text that VoiceOver reads:

| file:line | Screen | What it does | Note |
|---|---|---|---|
| `app/room/[id]/index.tsx:410` | Room chat | Tap to dismiss the "AI save failed" note | Child is `<Hint>` (text). Role `button`, no hint that tapping dismisses it. |
| `app/room/[id]/index.tsx:684` | Room chat, my failed message | Tap a failed bubble to retry/delete | Child is the message bubble (text). Role `button`, hint `en.chat.failed`. |

## B. Missing accessibilityRole

| file:line | Screen | What it does | Note |
|---|---|---|---|
| `components/status-picker.tsx:91` | Status picker sheet (Emergency/status) | Full-screen backdrop; tap closes the sheet | Label `en.room.cancel`, no role. |
| `features/chat/chat-sheet.tsx:34` | Chat "more" sheet | Full-screen backdrop; tap closes the sheet | Label `en.chat.moreClose`, no role. |
| `components/join-code-screen.tsx:53` | Join by code | Tapping the 5 digit boxes focuses the hidden input | `accessible={false}`, boxes hidden from VoiceOver; the TextInput itself is the accessible element. Likely intentional. |
| `components/calendar/highlighter-stroke.tsx:84` | Calendar month grid | Tap an event stroke | Not a miss: role `button` and label come from `strokeA11y()` spread (`components/calendar/sketch.ts:187`); non-primary strokes are hidden on purpose. |

## C. Button busy state

| file:line | Screen | What it does | Note |
|---|---|---|---|
| `components/ui.tsx:197` | All screens (25 call sites pass `busy`) | While `busy`, the title Text is replaced by an `ActivityIndicator` | No `accessibilityLabel`, so while busy VoiceOver has no name for the button (state says busy). Applies app-wide. |

## D. Icon-only controls (all have a label and a role)

Listed for review of wording; none is missing a label or role.

| file:line | Screen | What it does | Label |
|---|---|---|---|
| `app/create-room.tsx:392` | Create room | Fewer people (minus, long-press repeats) | `en.createRoom.fewerPeople` |
| `app/create-room.tsx:421` | Create room | More people (plus, long-press repeats) | `en.createRoom.morePeople` |
| `app/create-room.tsx:476` | Create room | Pick room icon | `en.createRoom.iconNames[key]` / `iconLabel` |
| `app/create-room.tsx:605` | Create room | Remove start time | `en.createRoom.removeStartTime` |
| `app/plan-preview.tsx:77` | Plan preview | Close (xmark) | `t.close` |
| `app/room/[id]/face.tsx:350` | Face match | Pick / choose another reference photo (image) | `en.face.pickPhoto` / `chooseAnother` |
| `app/room/[id]/gallery.tsx:500` | Gallery upload row | Cancel upload (xmark.circle.fill) | `en.media.cancelUpload…` |
| `app/room/[id]/gallery.tsx:380` | Gallery grid | Open a photo tile (image, role `imagebutton`) | media label / `previewUnavailable` |
| `app/room/[id]/index.tsx:506` | Room chat composer | Plus menu toggle | `en.chat.more` / `moreClose` / `moreGated` |
| `app/room/[id]/media/[mediaId].tsx:291` | Media viewer | More menu (ellipsis.circle) | `en.media.more` |
| `components/composer.tsx:48` | Room chat composer | Send | `sendLabel` |
| `components/home-header-button.tsx:15` | Room header | Back to rooms (chevron.left) | `en.room.backToRooms` |
| `components/media-cards.tsx:27` | Saved media card | Dismiss (xmark) | `en.media.dismissSaved` |
| `components/room-activity.tsx:346` | Room activity | Hide Emergency (chevron.up) | `en.activity.hideEmergency` |
| `components/route-editor.tsx:197` | Route editor | Cancel (chevron.left) | `en.map.cancel` |
| `features/calendar/calendar-screen.tsx:142` | Calendar | Add event (plus) | `t.add` |
| `features/calendar/calendar-screen.tsx:158` | Calendar | Ask (FAB art image) | `t.ask` |
| `features/calendar/calendar-screen.tsx:171` | Calendar | Previous month | `t.prevMonth` |
| `features/calendar/calendar-screen.tsx:177` | Calendar | Next month | `t.nextMonth` |
| `features/calendar/event-editor.tsx:164` | Calendar event editor | Pick ink icon | `inkIconLabel(e)` |
| `features/chat/pinned-notice.tsx:43` | Room chat pinned notice | Expand / collapse | `en.chat.pinnedExpand` / `pinnedCollapse` |
| `features/chat/pinned-notice.tsx:53` | Room chat pinned notice | Dismiss (xmark) | `en.chat.pinnedDismiss` |
| `features/chat/chat-header.tsx:50` | Room chat header | Notices bell (badge count hidden; count is in the label) / Settings gear | `en.chat.noticesA11y(unread)` / `en.chat.settings` |
| `features/event/qrewing-fab.tsx:139` | Room (Qrewing FAB) | Open Qrewing menu (art image) | `s.fabLabel` |
| `features/event/qrewing-fab.tsx:158` | Room (Qrewing FAB, alt) | Open Qrewing menu (art image) | `s.fabLabel` |
| `features/event/question-editor.tsx:43` | Host RSVP form builder | Question row action icon | `label` prop |

## Not found

- No hard-coded English `accessibilityLabel="..."` strings; all labels come from `i18n/en.ts`.
- No `<Text onPress>` or bare `<Link>` (without `asChild`) controls.
