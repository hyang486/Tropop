# Tropop fonts

Source Sans 3 (Adobe, SIL Open Font License 1.1; full text in SourceSans3-OFL.txt), the one typeface of the app
(B1, phase1 spec section 4). Source: github.com/adobe-fonts/source-sans release 3.052R (TTF).

| File | Family key | Weight |
|---|---|---|
| SourceSans3-Regular.ttf | `SourceSans3-Regular` | 400 |
| SourceSans3-Semibold.ttf | `SourceSans3-Semibold` | 600 |
| SourceSans3-Bold.ttf | `SourceSans3-Bold` | 700 |

Embedded at build by the `expo-font` config plugin (app.json) and also loaded at runtime in the root layout.
`src/components/text.tsx` picks the file from the style's fontWeight; iOS ignores fontWeight on a custom family.
