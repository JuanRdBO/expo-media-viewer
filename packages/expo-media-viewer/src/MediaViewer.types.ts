import type React from "react";
import type { ImageSourcePropType, NativeSyntheticEvent } from "react-native";

export type MediaViewerMediaType = "image" | "video";
export type MediaViewerThumbnailMode = "static" | "loop-muted";
export type MediaViewerThumbnailFit = "cover" | "contain";
export type MediaViewerHeaders = Record<string, string>;
export type MediaViewerSource = string | ImageSourcePropType;
export type MediaViewerBlurhash =
  | string
  | {
      hash: string;
      width?: number;
      height?: number;
    };

export type MediaViewerThumbnail = {
  source?: MediaViewerSource;
  headers?: MediaViewerHeaders;
  mode?: MediaViewerThumbnailMode;
  blurhash?: MediaViewerBlurhash;
};

export type MediaViewerItemChrome = {
  title?: string;
  subtitle?: string;
  footer?: string;
};

type MediaViewerBaseItem = {
  id?: string;
  source: MediaViewerSource;
  headers?: MediaViewerHeaders;
  blurhash?: MediaViewerBlurhash;
  thumbnail?: MediaViewerThumbnail;
  chrome?: MediaViewerItemChrome;
};

export type MediaViewerImageItem = MediaViewerBaseItem & {
  type: "image";
  duration?: never;
};

export type MediaViewerVideoItem = MediaViewerBaseItem & {
  type: "video";
  duration?: string;
};

export type MediaViewerItem = MediaViewerImageItem | MediaViewerVideoItem;

export type MediaViewerThumbnailConfig = {
  fit?: MediaViewerThumbnailFit;
  mode?: MediaViewerThumbnailMode;
  /**
   * @deprecated Use `mode`. When both are set, `mode` takes precedence.
   */
  videoMode?: MediaViewerThumbnailMode;
};

export type MediaViewerConfig = {
  theme?: "dark" | "light";
  request?: {
    headers?: MediaViewerHeaders;
  };
  thumbnail?: MediaViewerThumbnailConfig;
  videoIndicator?: boolean;
  viewer?: {
    edgeToEdge?: boolean;
    hideBlurOverlay?: boolean;
    hidePageIndicators?: boolean;
  };
};

export type MediaViewerFrameConfig = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  aspectRatio?: number;
  flex?: number;
  borderRadius?: number;
  backgroundColor?: string;
};

export type MediaViewerRenderItemOptions = {
  frame?: MediaViewerFrameConfig;
  thumbnail?: {
    fit?: MediaViewerThumbnailFit;
    mode?: MediaViewerThumbnailMode;
  };
  videoIndicator?: boolean;
  overlay?: React.ReactNode;
};

export type MediaViewerRenderItem = (
  index: number,
  options?: MediaViewerRenderItemOptions,
) => React.ReactElement | null;

export type MediaViewerLayoutRenderArgs<TItem extends MediaViewerItem = MediaViewerItem> = {
  items: TItem[];
  renderItem: MediaViewerRenderItem;
};

export type MediaViewerRenderLayout<TItem extends MediaViewerItem = MediaViewerItem> = (
  args: MediaViewerLayoutRenderArgs<TItem>,
) => React.ReactNode;

export type MediaViewerOverlayRenderArgs<TItem extends MediaViewerItem = MediaViewerItem> = {
  /** The item currently shown in the fullscreen viewer. */
  item: TItem;
  /** The index of the current item. */
  index: number;
  /** Dismisses the fullscreen viewer with the standard animation. */
  close: () => void;
};

/**
 * Renders custom React content pinned to the top (`renderHeader`) or bottom
 * (`renderFooter`) of the fullscreen viewer. The content is your own React
 * tree — buttons, gestures, etc. all work — reparented into the native viewer
 * while it is open. Native only (iOS + Android); a no-op on web for now.
 */
export type MediaViewerRenderOverlay<TItem extends MediaViewerItem = MediaViewerItem> = (
  args: MediaViewerOverlayRenderArgs<TItem>,
) => React.ReactNode;

export type MediaViewerProps<TItem extends MediaViewerItem = MediaViewerItem> = {
  items: TItem[];
  renderLayout: MediaViewerRenderLayout<TItem>;
  config?: MediaViewerConfig;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  /** Custom content pinned to the top of the fullscreen viewer. iOS + Android. */
  renderHeader?: MediaViewerRenderOverlay<TItem>;
  /** Custom content pinned to the bottom of the fullscreen viewer. iOS + Android. */
  renderFooter?: MediaViewerRenderOverlay<TItem>;
  /** Hides the built-in native close button (use with a custom `renderHeader`). iOS only. */
  hideCloseButton?: boolean;
};

type MediaViewerIndexChangedPayload = {
  currentIndex: number;
};

export type MediaViewerVideoPlaybackStage = "remote" | "fallback-download" | "fallback-playback";

type MediaViewerVideoErrorPayload = {
  index: number;
  url: string;
  message: string;
  nativeMessage?: string;
  underlyingMessage?: string;
  platform: "ios" | "android" | "web";
  stage: MediaViewerVideoPlaybackStage;
};

export type MediaViewerIndexChangedEvent = NativeSyntheticEvent<MediaViewerIndexChangedPayload>;
export type MediaViewerVideoErrorEvent = NativeSyntheticEvent<MediaViewerVideoErrorPayload>;

/**
 * Internal resolved item shape. JS thumbnails read the visual-only fields,
 * while iOS and Android receive this array serialized as `itemsJson`.
 */
export type NativeMediaViewerItem = {
  id: string;
  type: MediaViewerMediaType;
  uri: string;
  headers?: MediaViewerHeaders;
  thumbnailUri?: string;
  thumbnailHeaders?: MediaViewerHeaders;
  thumbnailMode?: MediaViewerThumbnailMode;
  blurhash?: MediaViewerBlurhash;
  thumbnailBlurhash?: MediaViewerBlurhash;
  title?: string;
  subtitle?: string;
  footer?: string;
  duration?: string;
};

export type NativeMediaViewerPayload = NativeMediaViewerItem[];

export type NativeMediaViewerThumbnailAnchor = {
  cornerRadius?: number;
  contentFit: MediaViewerThumbnailFit;
};
