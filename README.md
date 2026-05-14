<h1 align="center">expo-media-viewer</h1>

<p align="center">
  Native fullscreen galleries for Expo apps with images, videos, thumbnails, transitions, zoom, and authenticated media URLs.
</p>

<p align="center">
  <a href="https://github.com/JuanRdBO/expo-media-viewer/actions/workflows/validate.yml"><img src="https://github.com/JuanRdBO/expo-media-viewer/actions/workflows/validate.yml/badge.svg" alt="Validate" /></a>
  <a href="https://www.npmjs.com/package/expo-media-viewer"><img src="https://img.shields.io/npm/v/expo-media-viewer" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/expo-media-viewer"><img src="https://img.shields.io/npm/dm/expo-media-viewer" alt="npm downloads" /></a>
</p>

<table align="center">
  <tr>
    <td align="center"><strong>iOS</strong></td>
    <td align="center"><strong>Android</strong></td>
  </tr>
  <tr>
    <td><img src="./demo-ios.gif" width="290" alt="iOS fullscreen media viewer demo" /></td>
    <td><img src="./demo-android.gif" width="290" alt="Android fullscreen media viewer demo" /></td>
  </tr>
</table>

Use it when your app has a feed, chat, profile, memory timeline, marketplace listing, or gallery where a thumbnail should open into a polished native viewer. You pass the media model once, render whatever layout you want, and the package owns the hard parts: image zoom, video playback, shared open/close transitions, thumbnail rendering, swipe-to-dismiss, fullscreen chrome, and request headers.

Inspired by [@nandorojo/galeria](https://github.com/nandorojo/galeria), redesigned around mixed image/video collections.

## Why It Feels Different

| Built for | What you get |
|---|---|
| Mixed media | Images and videos share one `items` array instead of separate image-only props |
| Real app layouts | Bring your own grid, feed, carousel, or masonry UI through the render prop |
| Package-owned thumbnails | Static images, posters, muted looping video previews, and video duration badges |
| Native fullscreen UX | Pinch-to-zoom, page swiping, swipe-to-dismiss, shared transitions, and video playback |
| Private media | Global request headers plus per-media and per-thumbnail overrides |

## Highlights

- **One source of truth** - define media, thumbnails, headers, chrome, and duration in `items`
- **Any layout** - call `renderItem(index, options)` wherever a tappable thumbnail should appear
- **Image and video support** - videos get native playback plus a built-in play indicator by default
- **Transition matching** - thumbnail size and `borderRadius` are reused by the native open/close animation
- **Authenticated URLs** - attach headers globally or per item for private CDNs and signed media
- **Local assets** - supports URI strings, `require(...)`, and `Image.resolveAssetSource(...)` style sources
- **iOS and Android only** - focused native implementation, no web fallback layer
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
