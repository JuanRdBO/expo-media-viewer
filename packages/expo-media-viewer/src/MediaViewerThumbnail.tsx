import { Image, type ImageSource } from "expo-image";
import { requireNativeView } from "expo";
import { useMemo } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import type {
  MediaViewerBlurhash,
  MediaViewerThumbnailFit,
  MediaViewerThumbnailMode,
  NativeMediaViewerItem,
} from "./MediaViewer.types";

type MediaViewerThumbnailProps = {
  item: NativeMediaViewerItem;
  index: number;
  groupId: string;
  fit: MediaViewerThumbnailFit;
  mode: MediaViewerThumbnailMode;
};

type NativeVideoThumbnailProps = {
  groupId: string;
  index: number;
  itemJson: string;
  fit: MediaViewerThumbnailFit;
  pointerEvents?: "none";
  style: ViewStyle;
};

const NativeVideoThumbnail = requireNativeView<NativeVideoThumbnailProps>(
  "MediaViewer",
  "MediaViewerVideoThumbnailView",
);

export function MediaViewerThumbnail({ item, index, groupId, fit, mode }: MediaViewerThumbnailProps) {
  if (item.type === "video" && mode === "loop-muted") {
    return <LoopingVideoThumbnail item={item} index={index} groupId={groupId} fit={fit} />;
  }

  return <StaticThumbnail item={item} fit={fit} />;
}

export function MediaViewerVideoIndicator({ duration }: { duration?: string }) {
  return (
    <View pointerEvents="none" style={styles.videoIndicator}>
      <View style={styles.playCircle}>
        <View style={styles.playTriangle} />
      </View>
      {duration ? <Text style={styles.duration}>{duration}</Text> : null}
    </View>
  );
}

function StaticThumbnail({ item, fit }: Pick<MediaViewerThumbnailProps, "item" | "fit">) {
  const uri = item.thumbnailUri ?? (item.type === "image" ? item.uri : undefined);
  const headers = item.thumbnailUri ? item.thumbnailHeaders : item.headers;
  const placeholder = toBlurhashPlaceholder(item.thumbnailBlurhash ?? item.blurhash);

  if (!uri && !placeholder) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.placeholder]} />;
  }

  return (
    <Image
      pointerEvents="none"
      source={uri ? { uri, headers } : undefined}
      placeholder={placeholder}
      placeholderContentFit={fit}
      style={StyleSheet.absoluteFill}
      contentFit={fit}
      cachePolicy="memory-disk"
      recyclingKey={uri ?? placeholderRecyclingKey(placeholder)}
      transition={150}
    />
  );
}

function LoopingVideoThumbnail({
  item,
  index,
  groupId,
  fit,
}: Pick<MediaViewerThumbnailProps, "item" | "index" | "groupId" | "fit">) {
  const itemJson = useMemo(() => JSON.stringify(item), [item]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <StaticThumbnail item={item} fit={fit} />
      <NativeVideoThumbnail
        groupId={groupId}
        index={index}
        itemJson={itemJson}
        fit={fit}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function toBlurhashPlaceholder(blurhash: MediaViewerBlurhash | undefined): ImageSource | undefined {
  if (!blurhash) return undefined;
  if (typeof blurhash === "string") {
    return { blurhash };
  }
  return {
    blurhash: blurhash.hash,
    width: blurhash.width,
    height: blurhash.height,
  } satisfies ImageSource;
}

function placeholderRecyclingKey(placeholder: ImageSource | undefined) {
  if (!placeholder) return undefined;
  return placeholder.blurhash;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#171717",
  },
  videoIndicator: {
    position: "absolute",
    right: 8,
    bottom: 8,
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  playCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  playTriangle: {
    marginLeft: 2,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#111",
  },
  duration: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
