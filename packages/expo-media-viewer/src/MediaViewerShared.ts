import { Image as ReactNativeImage, type ViewStyle } from "react-native";
import type {
  MediaViewerHeaders,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
  MediaViewerSource,
  NativeMediaViewerItem,
} from "./MediaViewer.types";

export function normalizeItems(
  items: MediaViewerProps["items"],
  defaultHeaders: MediaViewerHeaders | undefined,
): NativeMediaViewerItem[] {
  return items.map((item, index) => {
    const uri = resolveSource(item.media.source);
    const thumbnailUri = item.thumbnail?.source ? resolveSource(item.thumbnail.source) : undefined;
    const thumbnailHeaders = mergeHeaders(
      defaultHeaders,
      item.thumbnail?.headers ?? item.media.headers,
    );

    return {
      id: item.id ?? `${item.type}:${uri}:${index}`,
      type: item.type,
      uri,
      headers: mergeHeaders(defaultHeaders, item.media.headers),
      thumbnailUri,
      thumbnailHeaders,
      thumbnailMode: item.thumbnail?.mode,
      title: item.chrome?.title,
      subtitle: item.chrome?.subtitle,
      footer: item.chrome?.footer,
      duration: item.duration,
    };
  });
}

function resolveSource(source: MediaViewerSource): string {
  if (typeof source === "string") {
    return source;
  }

  return ReactNativeImage.resolveAssetSource(source).uri;
}

function mergeHeaders(
  defaultHeaders: MediaViewerHeaders | undefined,
  itemHeaders: MediaViewerHeaders | undefined,
) {
  const headers = { ...defaultHeaders, ...itemHeaders };
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function toFrameStyle(options: MediaViewerRenderItemOptions): ViewStyle {
  const frame = options.frame;
  return {
    width: frame?.width,
    height: frame?.height,
    aspectRatio: frame?.aspectRatio,
    flex: frame?.flex,
    borderRadius: frame?.borderRadius,
    overflow: "hidden",
    backgroundColor: frame?.backgroundColor ?? "#111",
  };
}
