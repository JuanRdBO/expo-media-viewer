# Context

`expo-media-viewer` is an Expo module for native fullscreen media viewing on iOS and Android. It turns app-owned thumbnail layouts into package-owned fullscreen image and video presentation with native transitions, zoom, swipe paging, swipe-to-dismiss, chrome, request headers, and video playback.

The package is intentionally native-only for now. There is no web fallback layer in the supported surface.

## Domain Language

- **Media item**: One image or video in the viewer's `items` array. This is the public source of truth for source URL, type, headers, thumbnail, blurhash, chrome, and duration.
- **Source**: A URI string or React Native image source that resolves to the media URL passed to native code.
- **Thumbnail**: Package-owned visual preview rendered by `renderItem`. It can use the item source, a separate thumbnail source, a blurhash placeholder, and either static or muted looping video mode.
- **Frame**: The size, aspect ratio, background color, and `borderRadius` passed to `renderItem`. Native transitions reuse this geometry so the fullscreen viewer opens and closes from the same visual shape.
- **Layout**: App-owned React Native UI built in `renderLayout`. The app decides where thumbnails live; the package decides how each thumbnail opens the viewer.
- **Viewer**: Native fullscreen presentation with paging, zoom, chrome, dismissal, and media playback.
- **Chrome**: Optional title, subtitle, and footer shown by the native viewer for the current item.
- **Native payload**: Internal resolved array serialized to native. It is derived from `items` and is not a public API.
- **Thumbnail trigger**: The tappable React Native thumbnail node that registers its native view and launches the viewer.
- **Playback stage**: The video error phase reported to JS: `remote`, `fallback-download`, or `fallback-playback`.

## Ownership Boundaries

- Apps own data selection, item ordering, and layout composition.
- The JS package owns source resolution, header merging, thumbnail rendering, and trigger wiring.
- Native iOS and Android own fullscreen presentation, transition measurement, zoom, video playback, dismissal, and event payloads.
- Documentation should describe the current media-first API only. The pre-0.5 image-first API is intentionally not preserved as a compatibility surface.
