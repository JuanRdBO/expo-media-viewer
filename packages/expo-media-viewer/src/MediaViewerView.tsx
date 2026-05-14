import { useCallback, useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import type {
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
} from "./MediaViewer.types";
import { normalizeItems, toFrameStyle } from "./MediaViewerShared";
import { MediaViewerThumbnail, MediaViewerVideoIndicator } from "./MediaViewerThumbnail";

function MediaViewer<TItem extends MediaViewerItem = MediaViewerItem>({
  items,
  config,
  renderLayout,
}: MediaViewerProps<TItem>) {
  const nativeItems = useMemo(
    () => normalizeItems(items, config?.request?.headers),
    [items, config?.request?.headers],
  );

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
        <View key={item.id} style={toFrameStyle(itemOptions) as ViewStyle}>
          <MediaViewerThumbnail item={item} fit={fit} mode={mode} />
          {showVideoIndicator ? <MediaViewerVideoIndicator duration={item.duration} /> : null}
          {itemOptions.overlay ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {itemOptions.overlay}
            </View>
          ) : null}
        </View>
      );
    },
    [config, nativeItems],
  );

  return <>{renderLayout({ items, renderItem })}</>;
}

export { MediaViewer };
export default MediaViewer;
