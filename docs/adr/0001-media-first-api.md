# ADR 0001: Media-First Viewer API

## Status

Accepted

## Context

The original API grew from image viewing into mixed image and video collections. That made the component names and data flow feel image-first: users had to wrap content in a viewer, add another component, and pass image-specific children even when the item was a video.

The package is small enough that backwards compatibility is not a constraint for the next version. The public API should optimize for the shape we actually want rather than preserve the old one.

## Decision

Use a single media-first `<MediaViewer>` component:

- `items` is passed once and is the only source of truth for media, thumbnails, headers, blurhashes, chrome text, and video duration.
- `renderLayout` is required so every usage chooses its actual app layout explicitly.
- `renderLayout` receives `{ items, renderItem }`. Apps call `renderItem(index, options)` anywhere a tappable thumbnail should appear.
- `renderItem` owns the thumbnail trigger, media thumbnail, video indicator, and transition registration.
- `config` contains package-level behavior such as theme, request headers, thumbnail defaults, video indicator behavior, and viewer options.
- `frame` is the thumbnail geometry passed per rendered item. It intentionally avoids the name `style` because React Native already uses `style` for raw view styling.
- Video duration is an optional top-level `duration` field on the item. There is no nested `video` object because `type: "video"` already says what the item is.
- Thumbnail behavior lives under `thumbnail`, including `source`, `headers`, `blurhash`, and `mode`.
- Sources may be URI strings or React Native image sources resolved with `Image.resolveAssetSource`.
- The supported platform surface is iOS and Android only.

## Consequences

- This is a breaking API rewrite.
- The API reads the same for images and videos.
- Consumers no longer specify the same media twice.
- The app keeps full control over layout without owning thumbnail wiring details.
- The package keeps control of viewer launch semantics and native transition matching.
- Native payloads remain internal and can change as long as the public `items` contract is preserved.

## Example

```tsx
<MediaViewer
  items={[
    {
      type: "video",
      source: "https://example.com/video.mp4",
      thumbnail: {
        source: "https://example.com/poster.jpg",
        mode: "loop-muted",
      },
      duration: "0:18",
      chrome: {
        title: "Drone footage",
        footer: "1 / 1",
      },
    },
  ]}
  config={{
    theme: "dark",
    thumbnail: { fit: "cover" },
  }}
  renderLayout={({ renderItem }) =>
    renderItem(0, {
      frame: { width: 120, height: 120, borderRadius: 12 },
    })
  }
/>
```
