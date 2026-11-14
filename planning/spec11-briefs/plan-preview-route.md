# /plan-preview route (Plus intro)

`router.push('/plan-preview?from=<source>')` opens the Plus intro. `from` picks the headline and the benefit shown first and marked "For you". Unknown or missing values fall back to `more`.

| `from` | Pushed by | Headline | First benefit |
|---|---|---|---|
| `calendar` | Calendar "Add with Qrewing" (Free tap, or 402 plan_limit) | Add with Qrewing is a Plus feature | Add with Qrewing |
| `diary` | Calendar diary upsell card | The Qrewing diary is a Plus feature | Qrewing diary |
| `room-ai` | Room Qrewing button for Free (developer-event) | Qrewing AI is a Plus feature | Qrewing AI in rooms |
| `more` | create-room "More" / PT402, profile link, default | Do more with Qrew Plus | Bigger and longer rooms |

Source: `mobile/src/features/calendar/plus-intro.ts` (`plusFrom`, `plusBenefits`), copy in `en.planPreview`.
