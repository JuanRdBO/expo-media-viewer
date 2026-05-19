# expo-media-viewer

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
