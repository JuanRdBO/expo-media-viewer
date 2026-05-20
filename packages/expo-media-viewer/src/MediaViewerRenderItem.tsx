import type React from "react";
import { useCallback } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import type {
  MediaViewerConfig,
  MediaViewerRenderItem,
  MediaViewerRenderItemOptions,
  NativeMediaViewerItem,
} from "./MediaViewer.types";
import { resolveThumbnailMode, toFrameStyle, toThumbnailAnchor } from "./MediaViewerShared";
import { MediaViewerThumbnail, MediaViewerVideoIndicator } from "./MediaViewerThumbnail";

type RenderNativeFrame = (args: {
  key: string;
  index: number;
  style: ViewStyle;
  thumbnailAnchorJson: string;
  children: React.ReactNode;
}) => React.ReactElement;

type UseMediaViewerRenderItemArgs = {
  nativeItems: NativeMediaViewerItem[];
  config: MediaViewerConfig | undefined;
  groupId: string;
  renderNativeFrame: RenderNativeFrame;
};

export function useMediaViewerRenderItem({
  nativeItems,
  config,
  groupId,
  renderNativeFrame,
}: UseMediaViewerRenderItemArgs): MediaViewerRenderItem {
  return useCallback(
    (index: number, itemOptions: MediaViewerRenderItemOptions = {}) => {
      const item = nativeItems[index];
      if (!item) return null;

      const fit = itemOptions.thumbnail?.fit ?? config?.thumbnail?.fit ?? "cover";
      const mode = resolveThumbnailMode({
        optionMode: itemOptions.thumbnail?.mode,
        itemMode: item.thumbnailMode,
        config,
      });
      const showVideoIndicator =
        item.type === "video" && (itemOptions.videoIndicator ?? config?.videoIndicator ?? true);
      const thumbnailAnchorJson = JSON.stringify(toThumbnailAnchor(itemOptions, fit));

      return renderNativeFrame({
        key: item.id,
        index,
        style: toFrameStyle(itemOptions),
        thumbnailAnchorJson,
        children: (
          <>
            <MediaViewerThumbnail
              item={item}
              index={index}
              groupId={groupId}
              fit={fit}
              mode={mode}
            />
            {showVideoIndicator ? <MediaViewerVideoIndicator duration={item.duration} /> : null}
            {itemOptions.overlay ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {itemOptions.overlay}
              </View>
            ) : null}
          </>
        ),
      });
    },
    [config, groupId, nativeItems, renderNativeFrame],
  );
}
