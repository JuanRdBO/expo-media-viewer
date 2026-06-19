---
"expo-media-viewer": minor
---

Add custom header and footer overlays to the fullscreen viewer.

`renderHeader` and `renderFooter` render your own React content (buttons, gestures, anything) pinned to the top and bottom of the fullscreen viewer on iOS and Android. The content stays part of your React tree — state, handlers and re-renders keep working — and is reparented into the native viewer while it is open. The render args expose the current `item`, its `index`, and a `close()` helper that dismisses the viewer with the standard animation. A new `hideCloseButton` prop hides the built-in native close button when you supply your own.
