# Default avatars

Members without a photo can pick one of these pictures in Edit profile. The server stores only the key
(`profiles.avatar_path = 'default:<key>'`, key matches `[a-z0-9-]{1,30}`), so every phone must bundle the same keys.

Placeholders: `src/lib/default-avatars.ts` draws each key as an ink glyph on a tinted circle (no image files yet).

To use the final icons:
1. Drop square PNGs here named `<key>.png` (512x512, transparent or flat background), one per key in `DEFAULT_AVATARS`.
2. In `src/lib/default-avatars.ts` add `source: require('../../assets/images/default-avatars/<key>.png')` to each entry.
   `Avatar` and the picker then render the image instead of the glyph.
3. Keep old keys even if their art changes: other members' profiles may still point at them.
