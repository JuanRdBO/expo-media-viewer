import type { NativeSyntheticEvent, ViewStyle } from "react-native";

type MediaViewerIndexChangedPayload = {
  currentIndex: number;
};

type MediaViewerDebugPayload = {
  message: string;
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
export type MediaViewerDebugEvent = NativeSyntheticEvent<MediaViewerDebugPayload>;
export type MediaViewerVideoErrorEvent = NativeSyntheticEvent<MediaViewerVideoErrorPayload>;

export interface MediaViewerViewProps {
  index?: number;
  id?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  edgeToEdge?: boolean;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  hideBlurOverlay?: boolean;
  hidePageIndicators?: boolean;
  posterUrls?: string[];
}
