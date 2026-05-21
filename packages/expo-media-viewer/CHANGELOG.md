# expo-media-viewer

## 0.7.1

### Patch Changes

- 02a220e: Fix iOS EAS builds that compiled the media viewer without the React Native new architecture Swift flag by using UIKit child view lifecycle hooks instead of React architecture-specific subview APIs.

## 0.7.0

### Minor Changes

- 2abd3c2: Tighten media item typings around image and video variants, add thumbnail mode config types, and export media source helpers for consumer reuse.

  BREAKING: media viewer items now require a literal `type` discriminant (`"image"` or `"video"`) so image and video options can be checked precisely.

## 0.6.0

### Minor Changes

- 98914b0: Add web support with a browser fullscreen media viewer, web video thumbnails, keyboard navigation, swipe gestures, image zoom, and offscreen thumbnail playback pausing.

## 0.5.1

### Patch Changes

- a640436: Pause live video thumbnail autoplay while thumbnails are off screen.

## 0.5.0

### Minor Changes

- Finalize the media-first API by flattening media item sources and replacing function children with a required `renderLayout` prop.

## 0.4.1

### Patch Changes

- Add blurhash placeholders for media and thumbnail items.

## 0.4.0

### Major Rewrite

- Replaced the old image-first wrapper API with a media-first `items` + render-prop API.
- Removed the legacy `MediaViewer.Image` API so images and videos now use the same item model.
- Added package-owned image/video thumbnails, including static posters, muted looping video thumbnails, and default video indicators with optional durations.
- Added request headers for media and thumbnail URLs, with global defaults and per-item overrides for private media.
- Added React Native asset source support for `require(...)` and `Image.resolveAssetSource(...)` compatible values.
- Refreshed the example app and documentation around the new API.

This is a breaking API redesign even though the package is still pre-1.0.

## 0.3.1

### Patch Changes

- Refresh the npm package README and package metadata.
