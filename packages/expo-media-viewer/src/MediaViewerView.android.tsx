import { requireNativeView } from "expo";
import type React from "react";
import { useCallback, useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { controlEdgeToEdgeValues, isEdgeToEdge } from "react-native-is-edge-to-edge";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
  MediaViewerVideoErrorEvent,
} from "./MediaViewer.types";
import { normalizeItems, toFrameStyle } from "./MediaViewerShared";
import { MediaViewerThumbnail, MediaViewerVideoIndicator } from "./MediaViewerThumbnail";

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

  const renderItem = useCallback(
    (index: number, itemOptions: MediaViewerRenderItemOptions = {}) => {
      const item = nativeItems[index];
      if (!item) return null;

      const fit = itemOptions.thumbnail?.fit ?? config?.thumbnail?.fit ?? "cover";
      const mode =
        itemOptions.thumbnail?.mode ??
        item.thumbnailMode ??
        config?.thumbnail?.videoMode ??
        "static";
      const showVideoIndicator =
        item.type === "video" && (itemOptions.videoIndicator ?? config?.videoIndicator ?? true);

      return (
        <NativeMediaViewer
          key={item.id}
          index={index}
          itemsJson={itemsJson}
          edgeToEdge={EDGE_TO_EDGE || (config?.viewer?.edgeToEdge ?? false)}
          theme={config?.theme ?? "dark"}
          hidePageIndicators={config?.viewer?.hidePageIndicators ?? false}
          onIndexChange={onIndexChange}
          onVideoError={onVideoError}
          style={toFrameStyle(itemOptions)}
        >
          <MediaViewerThumbnail item={item} fit={fit} mode={mode} />
          {showVideoIndicator ? <MediaViewerVideoIndicator duration={item.duration} /> : null}
          {itemOptions.overlay ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {itemOptions.overlay}
            </View>
          ) : null}
        </NativeMediaViewer>
      );
    },
    [config, itemsJson, nativeItems, onIndexChange, onVideoError],
  );

  return <>{renderLayout({ items, renderItem })}</>;
}

export { MediaViewer };
export default MediaViewer;
