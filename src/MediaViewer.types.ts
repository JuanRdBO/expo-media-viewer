import type { NativeSyntheticEvent, ViewStyle } from "react-native";

type MediaViewerIndexChangedPayload = {
  currentIndex: number;
};

export type MediaViewerIndexChangedEvent = NativeSyntheticEvent<MediaViewerIndexChangedPayload>;

export interface MediaViewerViewProps {
  index?: number;
  id?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  edgeToEdge?: boolean;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  hideBlurOverlay?: boolean;
  hidePageIndicators?: boolean;
}
