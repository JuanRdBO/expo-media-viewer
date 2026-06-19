import { requireNativeView } from "expo";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import type { ViewStyle } from "react-native";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerVideoErrorEvent,
} from "./MediaViewer.types";
import { dismissMediaViewer, MediaViewerOverlayHost } from "./MediaViewerOverlayHost";
import { useMediaViewerRenderItem } from "./MediaViewerRenderItem";
import { normalizeItems } from "./MediaViewerShared";

type NativeMediaViewerProps = {
  index: number;
  itemsJson: string;
  theme: "dark" | "light";
  hideBlurOverlay?: boolean;
  hidePageIndicators?: boolean;
  hideCloseButton?: boolean;
  groupId: string;
  thumbnailAnchorJson: string;
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
  renderLayout,
  renderHeader,
  renderFooter,
  hideCloseButton,
}: MediaViewerProps<TItem>) {
  const nativeItems = useMemo(
    () => normalizeItems(items, config?.request?.headers),
    [items, config?.request?.headers],
  );
  const itemsJson = useMemo(() => JSON.stringify(nativeItems), [nativeItems]);
  const groupId = useMemo(() => makeGroupId(itemsJson), [itemsJson]);

  const hasOverlay = !!renderHeader || !!renderFooter;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleIndexChange = useCallback(
    (event: MediaViewerIndexChangedEvent) => {
      if (hasOverlay) {
        setCurrentIndex(event.nativeEvent.currentIndex);
      }
      onIndexChange?.(event);
    },
    [hasOverlay, onIndexChange],
  );

  const renderNativeFrame = useCallback(
    ({
      key,
      index,
      style,
      thumbnailAnchorJson,
      children,
    }: {
      key: string;
      index: number;
      style: ViewStyle;
      thumbnailAnchorJson: string;
      children: React.ReactNode;
    }) => (
      <NativeMediaViewer
        key={key}
        index={index}
        itemsJson={itemsJson}
        groupId={groupId}
        theme={config?.theme ?? "dark"}
        hideBlurOverlay={config?.viewer?.hideBlurOverlay ?? false}
        hidePageIndicators={config?.viewer?.hidePageIndicators ?? false}
        hideCloseButton={hideCloseButton ?? false}
        onIndexChange={handleIndexChange}
        onVideoError={onVideoError}
        thumbnailAnchorJson={thumbnailAnchorJson}
        style={style}
      >
        {children}
      </NativeMediaViewer>
    ),
    [config, groupId, itemsJson, handleIndexChange, onVideoError, hideCloseButton],
  );
  const renderItem = useMediaViewerRenderItem({ nativeItems, config, groupId, renderNativeFrame });

  const currentItem = items[currentIndex] ?? items[0];

  return (
    <>
      {renderLayout({ items, renderItem })}
      {hasOverlay && currentItem ? (
        <>
          {renderHeader ? (
            <MediaViewerOverlayHost groupId={groupId} placement="header">
              {renderHeader({ item: currentItem, index: currentIndex, close: dismissMediaViewer })}
            </MediaViewerOverlayHost>
          ) : null}
          {renderFooter ? (
            <MediaViewerOverlayHost groupId={groupId} placement="footer">
              {renderFooter({ item: currentItem, index: currentIndex, close: dismissMediaViewer })}
            </MediaViewerOverlayHost>
          ) : null}
        </>
      ) : null}
    </>
  );
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
