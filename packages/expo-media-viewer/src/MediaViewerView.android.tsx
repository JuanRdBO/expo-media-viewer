import { requireNativeView } from "expo";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { ViewStyle } from "react-native";
import { controlEdgeToEdgeValues, isEdgeToEdge } from "react-native-is-edge-to-edge";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerVideoErrorEvent,
} from "./MediaViewer.types";
import { useMediaViewerRenderItem } from "./MediaViewerRenderItem";
import { normalizeItems } from "./MediaViewerShared";

type NativeMediaViewerProps = {
  index: number;
  itemsJson: string;
  edgeToEdge: boolean;
  theme: "dark" | "light";
  hidePageIndicators?: boolean;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  style?: ViewStyle;
  children: React.ReactNode;
};

const EDGE_TO_EDGE = isEdgeToEdge();
const NativeMediaViewer = requireNativeView<NativeMediaViewerProps>("MediaViewer");

function MediaViewer<TItem extends MediaViewerItem = MediaViewerItem>({
  items,
  config,
  onIndexChange,
  onVideoError,
  renderLayout,
}: MediaViewerProps<TItem>) {
  if (__DEV__) {
    controlEdgeToEdgeValues({ edgeToEdge: config?.viewer?.edgeToEdge });
  }

  const nativeItems = useMemo(
    () => normalizeItems(items, config?.request?.headers),
    [items, config?.request?.headers],
  );
  const itemsJson = useMemo(() => JSON.stringify(nativeItems), [nativeItems]);

  const renderNativeFrame = useCallback(
    ({
      key,
      index,
      style,
      children,
    }: {
      key: string;
      index: number;
      style: ViewStyle;
      children: React.ReactNode;
    }) => (
      <NativeMediaViewer
        key={key}
        index={index}
        itemsJson={itemsJson}
        edgeToEdge={EDGE_TO_EDGE || (config?.viewer?.edgeToEdge ?? false)}
        theme={config?.theme ?? "dark"}
        hidePageIndicators={config?.viewer?.hidePageIndicators ?? false}
        onIndexChange={onIndexChange}
        onVideoError={onVideoError}
        style={style}
      >
        {children}
      </NativeMediaViewer>
    ),
    [config, itemsJson, onIndexChange, onVideoError],
  );
  const renderItem = useMediaViewerRenderItem({ nativeItems, config, renderNativeFrame });

  return <>{renderLayout({ items, renderItem })}</>;
}

export { MediaViewer };
export default MediaViewer;
