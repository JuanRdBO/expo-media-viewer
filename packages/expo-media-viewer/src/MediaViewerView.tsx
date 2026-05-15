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
  const itemsJson = useMemo(() => JSON.stringify(nativeItems), [nativeItems]);
  const groupId = useMemo(() => makeGroupId(itemsJson), [itemsJson]);

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
  const renderItem = useMediaViewerRenderItem({ nativeItems, config, groupId, renderNativeFrame });

  return <>{renderLayout({ items, renderItem })}</>;
}

function makeGroupId(itemsJson: string) {
  let hash = 0;
  for (let index = 0; index < itemsJson.length; index += 1) {
    hash = (hash * 31 + itemsJson.charCodeAt(index)) | 0;
  }
  return `media-viewer:${hash.toString(36)}`;
}

export { MediaViewer };
export default MediaViewer;
