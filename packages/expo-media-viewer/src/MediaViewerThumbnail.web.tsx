import { Image, type ImageSource } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  MediaViewerBlurhash,
  MediaViewerHeaders,
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
  active?: boolean;
};

const thumbnailVideos = new Map<string, HTMLVideoElement>();

export function MediaViewerThumbnail({
  item,
  index,
  groupId,
  fit,
  mode,
  active = true,
}: MediaViewerThumbnailProps) {
  if (item.type === "video" && mode === "loop-muted") {
    return (
      <LoopingVideoThumbnail
        item={item}
        index={index}
        groupId={groupId}
        fit={fit}
        active={active}
      />
    );
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

export function getWebVideoThumbnailTime(key: string) {
  const video = thumbnailVideos.get(key);
  return video?.currentTime ?? 0;
}

export function syncWebVideoThumbnailTime(key: string, time: number) {
  const video = thumbnailVideos.get(key);
  if (!video || !Number.isFinite(time) || time <= 0) return;

  try {
    video.currentTime = time;
  } catch {
    // Some streaming sources reject manual seeks until enough metadata is loaded.
    return;
  }
}

function StaticThumbnail({ item, fit }: Pick<MediaViewerThumbnailProps, "item" | "fit">) {
  const uri = item.thumbnailUri ?? (item.type === "image" ? item.uri : undefined);
  const headers = item.thumbnailUri ? item.thumbnailHeaders : item.headers;
  const placeholder = toBlurhashPlaceholder(item.thumbnailBlurhash ?? item.blurhash);
  const resolvedUri = useWebMediaUri(uri, headers);

  if (!resolvedUri && !placeholder) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.placeholder]} />;
  }

  return (
    <Image
      pointerEvents="none"
      source={resolvedUri ? { uri: resolvedUri } : undefined}
      placeholder={placeholder}
      placeholderContentFit={fit}
      style={StyleSheet.absoluteFill}
      contentFit={fit}
      cachePolicy="memory-disk"
      recyclingKey={resolvedUri ?? placeholderRecyclingKey(placeholder)}
      transition={150}
    />
  );
}

function LoopingVideoThumbnail({
  item,
  index,
  groupId,
  fit,
  active,
}: Pick<MediaViewerThumbnailProps, "item" | "index" | "groupId" | "fit" | "active">) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const thumbnailKey = toThumbnailKey(groupId, index);
  const posterUri = item.thumbnailUri;
  const posterHeaders = item.thumbnailUri ? item.thumbnailHeaders : item.headers;
  const videoUri = useWebMediaUri(item.uri, item.headers);
  const resolvedPosterUri = useWebMediaUri(posterUri, posterHeaders);
  const objectFit = fit === "contain" ? "contain" : "cover";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    thumbnailVideos.set(thumbnailKey, video);
    return () => {
      thumbnailVideos.delete(thumbnailKey);
    };
  }, [thumbnailKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible((entry?.intersectionRatio ?? 0) >= 0.2);
      },
      { threshold: [0, 0.2, 0.6] },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active || !isVisible || !videoUri) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      // Browser autoplay policy can still block muted previews in unusual contexts.
    });
  }, [active, isVisible, videoUri]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <StaticThumbnail item={item} fit={fit} />
      {videoUri
        ? createVideoElement({
            ref: videoRef,
            src: videoUri,
            poster: resolvedPosterUri,
            objectFit,
          })
        : null}
    </View>
  );
}

function createVideoElement({
  ref,
  src,
  poster,
  objectFit,
}: {
  ref: React.Ref<HTMLVideoElement>;
  src: string;
  poster: string | undefined;
  objectFit: "cover" | "contain";
}) {
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit,
        border: 0,
      }}
    />
  );
}

export function useWebMediaUri(uri: string | undefined, headers: MediaViewerHeaders | undefined) {
  const [objectUri, setObjectUri] = useState<string | undefined>();
  const headersJson = useMemo(() => (headers ? JSON.stringify(headers) : ""), [headers]);

  useEffect(() => {
    if (!uri || !headersJson) {
      setObjectUri(undefined);
      return;
    }

    let didCancel = false;
    let nextObjectUri: string | undefined;
    const requestHeaders = JSON.parse(headersJson) as MediaViewerHeaders;
    setObjectUri(undefined);

    fetch(uri, { headers: requestHeaders })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load media: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (didCancel) return;
        nextObjectUri = URL.createObjectURL(blob);
        setObjectUri(nextObjectUri);
      })
      .catch(() => {
        if (!didCancel) {
          setObjectUri(undefined);
        }
      });

    return () => {
      didCancel = true;
      if (nextObjectUri) {
        URL.revokeObjectURL(nextObjectUri);
      }
    };
  }, [headersJson, uri]);

  return headersJson ? objectUri : uri;
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

export function toThumbnailKey(groupId: string, index: number) {
  return `${groupId}:${index}`;
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
