# expo-media-viewer

[![Validate](https://github.com/JuanRdBO/expo-media-viewer/actions/workflows/validate.yml/badge.svg)](https://github.com/JuanRdBO/expo-media-viewer/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/expo-media-viewer)](https://www.npmjs.com/package/expo-media-viewer)
[![npm downloads](https://img.shields.io/npm/dm/expo-media-viewer)](https://www.npmjs.com/package/expo-media-viewer)

Native fullscreen media viewer for iOS and Android, built as an [Expo Module](https://docs.expo.dev/modules/overview/). Pass image and video items once, render your layout with a render prop, and let the package handle thumbnails, tap targets, shared transitions, zoom, swipe-to-dismiss, video playback, and request headers.

Inspired by [@nandorojo/galeria](https://github.com/nandorojo/galeria) and extended for mixed image/video galleries.

<table align="center">
  <tr>
    <th>iOS</th>
    <th>Android</th>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/JuanRdBO/expo-media-viewer/main/demo-ios.gif" width="280" alt="iOS demo" /></td>
    <td><img src="https://raw.githubusercontent.com/JuanRdBO/expo-media-viewer/main/demo-android.gif" width="280" alt="Android demo" /></td>
  </tr>
</table>

## Features

- **Media-first API** - one `items` array for images, videos, thumbnails, headers, and fullscreen chrome
- **Owned thumbnails** - images, static video posters, muted looping video thumbnails, and default video indicators
- **Native fullscreen viewer** - pinch-to-zoom images, swipe-to-dismiss, page swiping, and native video playback
- **Shared transitions** - open and close from the rendered thumbnail frame with matching corner radius
- **Request headers** - global default headers plus per-media and per-thumbnail overrides
- **React Native asset sources** - supports URI strings and `Image.resolveAssetSource(...)` compatible sources
- **Dark and light themes** - control the fullscreen viewer background and chrome color
- **GPS extraction on Android** - read EXIF GPS coordinates from photos through MediaStore
- **Fabric and Classic support** - works with both React Native architectures

## Installation

```bash
npx expo install expo-media-viewer expo-image expo-video
```

Then rebuild your dev client:

```bash
npx expo prebuild --clean
npx expo run:ios   # or run:android
```

This package includes native Swift and Kotlin code, so it requires a development build. It does not run in Expo Go.

## Usage

```tsx
import { MediaViewer, type MediaViewerItem } from "expo-media-viewer";
import { View } from "react-native";

const items: MediaViewerItem[] = [
  {
    type: "image",
    media: { source: "https://example.com/photo.jpg" },
    chrome: {
      title: "Beach sunset",
      subtitle: "July 2025",
      footer: "1 / 2",
    },
  },
  {
    type: "video",
    media: { source: "https://example.com/video.mp4" },
    thumbnail: {
      source: "https://example.com/video-poster.jpg",
      mode: "loop-muted",
    },
    duration: "0:18",
    chrome: {
      title: "Drone footage",
      subtitle: "September 2025",
      footer: "2 / 2",
    },
  },
];

export function Gallery() {
  return (
    <MediaViewer
      items={items}
      config={{
        theme: "dark",
        thumbnail: { fit: "cover", videoMode: "loop-muted" },
      }}
      onIndexChange={(event) => {
        console.log("Current index:", event.nativeEvent.currentIndex);
      }}
    >
      {({ items, renderItem }) => (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {items.map((_item, index) =>
            renderItem(index, {
              frame: { width: 120, height: 120, borderRadius: 12 },
            }),
          )}
        </View>
      )}
    </MediaViewer>
  );
}
```

Video items automatically get a play indicator. If `duration` is present, it is shown inside that indicator.

## Request Headers

Use `config.request.headers` for defaults, then override them on `media.headers` or `thumbnail.headers`.

```tsx
<MediaViewer
  items={[
    {
      type: "video",
      media: {
        source: "https://media.example.com/private/video.mp4",
        headers: { "X-Media-Scope": "original" },
      },
      thumbnail: {
        source: "https://media.example.com/private/poster.jpg",
        headers: { "X-Media-Scope": "thumbnail" },
        mode: "loop-muted",
      },
      duration: "0:24",
    },
  ]}
  config={{
    request: {
      headers: { Authorization: `Bearer ${token}` },
    },
  }}
>
  {({ renderItem }) => renderItem(0, { frame: { width: 160, height: 160 } })}
</MediaViewer>
```

Header precedence:

- Media requests use `{ ...config.request.headers, ...item.media.headers }`
- Thumbnail requests use `{ ...config.request.headers, ...(item.thumbnail?.headers ?? item.media.headers) }`

## Asset Sources

`media.source` and `thumbnail.source` accept URI strings or React Native image sources. Local assets are resolved with React Native's asset resolver before they are passed to the native viewer.

```tsx
const items: MediaViewerItem[] = [
  {
    type: "image",
    media: { source: require("./assets/photo.jpg") },
  },
  {
    type: "video",
    media: { source: "https://example.com/video.mp4" },
    thumbnail: { source: require("./assets/video-poster.jpg") },
  },
];
```

## API

### `<MediaViewer>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `MediaViewerItem[]` | required | Single source of truth for image/video data |
| `children` | `(args: MediaViewerLayoutRenderArgs) => ReactNode` | required | Render prop for your layout. Call `renderItem(index, options)` for each tappable media item |
| `config` | `MediaViewerConfig` | - | Viewer theme, request defaults, thumbnail defaults, video indicator behavior, and native viewer options |
| `onIndexChange` | `(event: MediaViewerIndexChangedEvent) => void` | - | Called when the fullscreen viewer changes pages |
| `onVideoError` | `(event: MediaViewerVideoErrorEvent) => void` | - | Called when native video loading fails |

### `MediaViewerItem`

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | generated | Stable key for the item |
| `type` | `"image" \| "video"` | required | Media type |
| `media.source` | `string \| ImageSourcePropType` | required | Fullscreen image or video source |
| `media.headers` | `Record<string, string>` | - | Headers for the fullscreen media request |
| `thumbnail.source` | `string \| ImageSourcePropType` | image: `media.source`, video: placeholder | Thumbnail or video poster source |
| `thumbnail.headers` | `Record<string, string>` | `media.headers` | Headers for the thumbnail request |
| `thumbnail.mode` | `"static" \| "loop-muted"` | `"static"` | Per-item thumbnail behavior |
| `chrome.title` | `string` | - | Title shown in fullscreen viewer chrome |
| `chrome.subtitle` | `string` | - | Subtitle shown in fullscreen viewer chrome |
| `chrome.footer` | `string` | - | Bottom fullscreen text, often a counter or caption |
| `duration` | `string` | - | Optional text shown in the default video indicator |

### `MediaViewerConfig`

| Prop | Type | Default | Description |
|---|---|---|---|
| `theme` | `"dark" \| "light"` | `"dark"` | Fullscreen viewer theme |
| `request.headers` | `Record<string, string>` | - | Default headers for media and thumbnail requests |
| `thumbnail.fit` | `"cover" \| "contain"` | `"cover"` | Default thumbnail content fit |
| `thumbnail.videoMode` | `"static" \| "loop-muted"` | `"static"` | Default thumbnail mode for videos |
| `videoIndicator` | `boolean` | `true` | Show the built-in video indicator for video items |
| `viewer.edgeToEdge` | `boolean` | platform default | Android edge-to-edge viewer dialog |
| `viewer.hideBlurOverlay` | `boolean` | `false` | iOS blur overlay behind the viewer |
| `viewer.hidePageIndicators` | `boolean` | `false` | Hide native page indicator dots |

### `renderItem(index, options)`

| Option | Type | Description |
|---|---|---|
| `frame.width` / `frame.height` | `number \| \`${number}%\`` | Thumbnail frame dimensions |
| `frame.aspectRatio` | `number` | Thumbnail frame aspect ratio |
| `frame.flex` | `number` | Flex value for grid and row layouts |
| `frame.borderRadius` | `number` | Thumbnail frame radius, also used by native transition matching |
| `frame.backgroundColor` | `string` | Thumbnail frame background |
| `thumbnail.fit` | `"cover" \| "contain"` | Per-item fit override |
| `thumbnail.mode` | `"static" \| "loop-muted"` | Per-item thumbnail mode override |
| `videoIndicator` | `boolean` | Per-item built-in video indicator override |
| `overlay` | `ReactNode` | Non-interactive app overlay rendered above the package thumbnail and video indicator |

## Android GPS Helper

```ts
import { readGpsFromPhoto } from "expo-media-viewer";

const coords = await readGpsFromPhoto(assetId, fileName);
if (coords) {
  console.log(coords.latitude, coords.longitude);
}
```

This uses `MediaStore.setRequireOriginal()` to bypass Android 10+ scoped storage GPS stripping. It returns `null` on iOS or when no GPS data is found.

## Requirements

- Expo SDK 52+
- React Native 0.76+
- iOS 15.1+
- Android minSdk 24

## License

MIT
