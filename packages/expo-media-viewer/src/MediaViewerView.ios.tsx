import { requireNativeView } from "expo";
import type React from "react";
import { useCallback, useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { normalizeItems, toFrameStyle } from "./MediaViewerShared";
import { MediaViewerThumbnail, MediaViewerVideoIndicator } from "./MediaViewerThumbnail";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
  MediaViewerVideoErrorEvent,
} from "./MediaViewer.types";

type NativeMediaViewerProps = {
  index: number;
  itemsJson: string;
  theme: "dark" | "light";
  hideBlurOverlay?: boolean;
  hidePageIndicators?: boolean;
  onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
  onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  style?: ViewStyle;
  children: React.ReactNode;
};

const NativeMediaViewer = requireNativeView<NativeMediaViewerProps>("MediaViewer");

function MediaViewer<TItem extends MediaViewerItem = MediaViewerItem>({
  items,
  config,
  onIndexChange,
  onVideoError,
  children,
}: MediaViewerProps<TItem>) {
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
          theme={config?.theme ?? "dark"}
          hideBlurOverlay={config?.viewer?.hideBlurOverlay ?? false}
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

  return <>{children({ items, renderItem })}</>;
}

export { MediaViewer };
export default MediaViewer;
