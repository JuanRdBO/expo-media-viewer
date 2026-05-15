import type React from "react";
import { useCallback, useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import type { MediaViewerItem, MediaViewerProps } from "./MediaViewer.types";
import { useMediaViewerRenderItem } from "./MediaViewerRenderItem";
import { normalizeItems } from "./MediaViewerShared";

function MediaViewer<TItem extends MediaViewerItem = MediaViewerItem>({
  items,
  config,
  renderLayout,
}: MediaViewerProps<TItem>) {
  const nativeItems = useMemo(
    () => normalizeItems(items, config?.request?.headers),
    [items, config?.request?.headers],
  );

  const renderNativeFrame = useCallback(
    ({
      key,
      style,
      children,
    }: {
      key: string;
      index: number;
      style: ViewStyle;
      children: React.ReactNode;
    }) => (
      <View key={key} style={style}>
        {children}
      </View>
    ),
    [],
  );
  const renderItem = useMediaViewerRenderItem({ nativeItems, config, renderNativeFrame });

  return <>{renderLayout({ items, renderItem })}</>;
}

export { MediaViewer };
export default MediaViewer;
