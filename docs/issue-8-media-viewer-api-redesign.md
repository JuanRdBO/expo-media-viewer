# Issue 8 Media Viewer API Redesign Guide

## Goal

Replace the image-first API with a fresh media-first API for iOS and Android. The package owns thumbnail rendering, video affordances, tap handling, native registration, request headers, and fullscreen viewing. The app owns layout.

No backwards compatibility is required for this version.

## Final Public Shape

```tsx
<MediaViewer
  items={items}
  config={{
    theme: "dark",
    request: { headers },
    thumbnail: {
      fit: "cover",
      videoMode: "loop-muted",
    },
    videoIndicator: true,
    viewer: {
      edgeToEdge: true,
      hideBlurOverlay: false,
      hidePageIndicators: false,
    },
  }}
  onIndexChange={handleIndexChange}
  onVideoError={handleVideoError}
>
  {({ items, renderItem }) => (
    <View style={styles.grid}>
      {items.map((item, index) =>
        renderItem(index, {
          frame: { width: 120, height: 120, borderRadius: 12 },
          overlay: item.locked ? <LockedBadge /> : null,
        }),
      )}
    </View>
  )}
</MediaViewer>
```

## Item Model

```ts
import type { ImageSourcePropType } from "react-native";

type MediaViewerSource = string | ImageSourcePropType;

type MediaViewerItem = {
  id?: string;
  type: "image" | "video";
  media: {
    source: MediaViewerSource;
    headers?: Record<string, string>;
  };
  thumbnail?: {
    source?: MediaViewerSource;
    headers?: Record<string, string>;
    mode?: "static" | "loop-muted";
  };
  chrome?: {
    title?: string;
    subtitle?: string;
    footer?: string;
  };
  duration?: string;
};
```

## Decisions

- `items` is passed once and is the only public source of truth.
- The render prop is required through `children`.
- `renderItem(index, options)` renders the package-owned thumbnail trigger and opens fullscreen on tap.
- Use `config`, not a generic `style` prop, for viewer-level behavior.
- Use `thumbnail`, not `preview`.
- Use `frame`, not `tile`.
- Use `frame.borderRadius`, not `radius`.
- Use `source`, not `uri`, because sources can be URI strings or React Native image assets.
- `duration` is a top-level optional key and feeds the default video indicator.
- Videos get a package-owned default video indicator; callers can disable it with `videoIndicator: false`.
- Native receives one structured internal payload, `itemsJson`.
- Headers are supported by JS thumbnails and native fullscreen media.
- Do not add public cache policy, TTL, prefetch, or invalidation in this PR.

## Removed Old API

- `MediaViewer.Image`
- `renderLayout`
- `urls`
- `mediaTypes`
- `posterUrls`
- `topTitles`
- `topSubtitles`
- `bottomTexts`
- Old context/provider compatibility path
- Old native parallel-array props and fallback branches

## Tasks

- [x] Decide on breaking media-first API shape.
- [x] Confirm current Expo Module/native view architecture is sufficient.
- [x] Replace TypeScript public API with `items`, `config`, and required `children`.
- [x] Implement package-owned image thumbnails, static video posters, muted looping video thumbnails, and default video indicators.
- [x] Remove `MediaViewer.Image` and context/provider exports.
- [x] Pass one structured item payload to native instead of public parallel arrays.
- [x] Support image and video request headers on iOS.
- [x] Support image and video request headers on Android.
- [x] Support React Native asset sources through `Image.resolveAssetSource`.
- [x] Update feed and masonry demos to use the new render prop.
- [x] Update README and package README with the breaking API and headers examples.
- [x] Add a major Changesets entry.
- [x] Run package TypeScript and Biome checks.
- [x] Run example TypeScript check.
- [x] Run iOS example build with `cd example && bun build-ios-dev`.
- [x] Run Android example build with `cd example && bun build-android-dev`.
- [ ] Commit, push, and open a PR linked to issue #8 and issue #14.

## Validation Commands

```bash
cd packages/expo-media-viewer && bunx tsc --noEmit
cd example && bunx tsc --noEmit
bunx biome ci packages/expo-media-viewer/src/
bun install --frozen-lockfile
cd packages/expo-media-viewer && npm pack --dry-run --json
cd example && bun build-ios-dev
cd example && bun build-android-dev
```
