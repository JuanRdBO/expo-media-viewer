---
"expo-media-viewer": minor
---

Tighten media item typings around image and video variants, add thumbnail mode config types, and export media source helpers for consumer reuse.

BREAKING: media viewer items now require a literal `type` discriminant (`"image"` or `"video"`) so image and video options can be checked precisely.
