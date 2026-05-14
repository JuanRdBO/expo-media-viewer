# Issue 8 vNext API Decisions

Temporary working note. This is the source of truth for the next implementation pass until the API is finalized.

## Goal

Replace the image-first API with a fresh media-first API for iOS and Android. The package owns media thumbnail rendering, video affordances, tap handling, native registration, request headers, and fullscreen viewing. The app owns layout.

No backwards compatibility is required for this version.

## Target Usage

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
    <View>
      {items.map((item, index) =>
        renderItem(index, {
          frame: {
            width: 120,
            height: 120,
            borderRadius: 12,
          },
          overlay: item.locked ? <LockedBadge /> : null,
        }),
      )}
    </View>
  )}
</MediaViewer>
```

## Public Item Shape

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

## Public Props

```ts
type MediaViewerProps<TItem extends MediaViewerItem = MediaViewerItem> = {
  items: TItem[];
  config?: MediaViewerConfig;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  children: (args: MediaViewerLayoutRenderArgs<TItem>) => React.ReactNode;
};

type MediaViewerLayoutRenderArgs<TItem extends MediaViewerItem = MediaViewerItem> = {
  items: TItem[];
  renderItem: MediaViewerRenderItem;
};
```

## Render Item Options

```ts
type MediaViewerRenderItemOptions = {
  frame?: {
    width?: number | `${number}%`;
    height?: number | `${number}%`;
    aspectRatio?: number;
    flex?: number;
    borderRadius?: number;
    backgroundColor?: string;
  };
  thumbnail?: {
    fit?: "cover" | "contain";
    mode?: "static" | "loop-muted";
  };
  videoIndicator?: boolean;
  overlay?: React.ReactNode;
};
```

## Config Shape

```ts
type MediaViewerConfig = {
  theme?: "dark" | "light";
  request?: {
    headers?: Record<string, string>;
  };
  thumbnail?: {
    fit?: "cover" | "contain";
    videoMode?: "static" | "loop-muted";
  };
  videoIndicator?: boolean;
  viewer?: {
    edgeToEdge?: boolean;
    hideBlurOverlay?: boolean;
    hidePageIndicators?: boolean;
  };
};
```

## Decisions

- `MediaViewer` owns the thumbnail trigger and fullscreen opening.
- The app owns layout through a required render-prop `children`.
- Use `children={({ items, renderItem }) => ...}` instead of `renderLayout`.
- Keep `renderItem(index, options)` as the helper name and call shape.
- `renderLayout` should be removed.
- `MediaViewer.Image` should be removed.
- `items` are passed once and are the only public source of truth.
- `children` receives the original public items, not normalized/internal items.
- `MediaViewerProps` should be generic so app-specific item fields survive in the render prop.
- The package renders thumbnails internally. Do not add custom thumbnail rendering yet.
- Use `source`, not `uri`, because values can be URI strings or React Native image sources.
- Support `Image.resolveAssetSource(...)` style sources for both `media.source` and `thumbnail.source`.
- Headers stay on `media.headers` and `thumbnail.headers`; do not extract headers from source objects.
- `config.request.headers` provides defaults for all media and thumbnail requests.
- Media request header precedence: `{ ...config.request.headers, ...item.media.headers }`.
- Thumbnail request header precedence: `{ ...config.request.headers, ...(item.thumbnail?.headers ?? item.media.headers) }`.
- Use `thumbnail`, not item-level `preview`.
- Put item-level thumbnail behavior at `thumbnail.mode`.
- Use `config.thumbnail`, not `config.preview`.
- Use `config.thumbnail.videoMode` globally because the global setting only affects videos.
- Use `frame`, not `tile`.
- Use `frame.borderRadius`, not `frame.radius`.
- `duration` stays as an optional top-level item field.
- Videos get a package-owned default video indicator.
- If `duration` exists on a video item, the default video indicator should show it.
- `videoIndicator: false` can disable the built-in indicator globally or per rendered item.
- Video indicator is separate from `overlay`.
- Layering order: thumbnail media, built-in video indicator, app overlay.
- Keep `overlay` as a non-interactive app-specific decoration slot.
- Move callbacks to top-level props.
- Keep static config like `theme`, `request`, `thumbnail`, `viewer`, and `videoIndicator` inside `config`.
- Keep `chrome` for fullscreen title/subtitle/footer.
- Keep `chrome.footer` as the bottom chrome text.
- Support iOS and Android only in docs.
- Keep an undocumented unsupported-platform fallback only so imports/tests do not explode.
- Remove all old native parallel-array props and branches.
- Native should receive one internal structured payload, currently `itemsJson`.
- Keep `itemsJson` internal. It is not public API.
- Do not add public caching controls in this PR.
- Keep sensible internal cache defaults through `expo-image`, SDWebImage/URLCache on iOS, and Glide on Android.

## Removed Old API

Remove these completely:

- `MediaViewer.Image`
- `urls`
- `mediaTypes`
- `posterUrls`
- `topTitles`
- `topSubtitles`
- `bottomTexts`
- old context/provider compatibility path
- old native parallel-array props and fallback branches

## Known Intentional Non-Goals

- No custom thumbnail renderer in this PR.
- No public `open(index)` API in this PR.
- No public cache policy, prefetch, TTL, or invalidation API in this PR.
- No backwards compatibility wrappers.
- No documented web support.
- No ADR for now; this note is temporary working context.
