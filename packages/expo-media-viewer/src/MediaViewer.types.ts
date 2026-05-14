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

export type MediaViewerItem = {
  id?: string;
  type: MediaViewerMediaType;
  media: {
    source: MediaViewerSource;
    headers?: MediaViewerHeaders;
    blurhash?: MediaViewerBlurhash;
  };
  thumbnail?: {
    source?: MediaViewerSource;
    headers?: MediaViewerHeaders;
    mode?: MediaViewerThumbnailMode;
    blurhash?: MediaViewerBlurhash;
  };
  chrome?: {
    title?: string;
    subtitle?: string;
    footer?: string;
  };
  duration?: string;
};

export type MediaViewerConfig = {
  theme?: "dark" | "light";
  request?: {
    headers?: MediaViewerHeaders;
  };
  thumbnail?: {
    fit?: MediaViewerThumbnailFit;
    videoMode?: MediaViewerThumbnailMode;
  };
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

export type MediaViewerProps<TItem extends MediaViewerItem = MediaViewerItem> = {
  items: TItem[];
  config?: MediaViewerConfig;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  children: (args: MediaViewerLayoutRenderArgs<TItem>) => React.ReactNode;
};

type MediaViewerIndexChangedPayload = {
  currentIndex: number;
};

type MediaViewerVideoErrorPayload = {
  index: number;
  url: string;
  message: string;
  nativeMessage?: string;
  underlyingMessage?: string;
  platform: "ios" | "android";
  stage: "remote" | "fallback-download" | "fallback-playback";
};

export type MediaViewerIndexChangedEvent = NativeSyntheticEvent<MediaViewerIndexChangedPayload>;
export type MediaViewerVideoErrorEvent = NativeSyntheticEvent<MediaViewerVideoErrorPayload>;

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
