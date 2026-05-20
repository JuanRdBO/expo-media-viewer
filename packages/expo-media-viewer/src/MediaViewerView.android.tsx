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
  groupId: string;
  thumbnailAnchorJson: string;
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
  const groupId = useMemo(() => makeGroupId(itemsJson), [itemsJson]);

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
        edgeToEdge={EDGE_TO_EDGE || (config?.viewer?.edgeToEdge ?? false)}
        theme={config?.theme ?? "dark"}
        hidePageIndicators={config?.viewer?.hidePageIndicators ?? false}
        onIndexChange={onIndexChange}
        onVideoError={onVideoError}
        thumbnailAnchorJson={thumbnailAnchorJson}
        style={style}
      >
        {children}
      </NativeMediaViewer>
    ),
    [config, groupId, itemsJson, onIndexChange, onVideoError],
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
