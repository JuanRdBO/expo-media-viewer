import { Image as ReactNativeImage, type ViewStyle } from "react-native";
import type {
  MediaViewerHeaders,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
  MediaViewerSource,
  NativeMediaViewerPayload,
} from "./MediaViewer.types";

export function normalizeItems(
  items: MediaViewerProps["items"],
  defaultHeaders: MediaViewerHeaders | undefined,
): NativeMediaViewerPayload {
  return items.map((item, index) => {
    const uri = resolveSource(item.source);
    const thumbnailUri = item.thumbnail?.source ? resolveSource(item.thumbnail.source) : undefined;
    const thumbnailHeaders = mergeHeaders(defaultHeaders, item.thumbnail?.headers ?? item.headers);

    return {
      id: item.id ?? `${item.type}:${uri}:${index}`,
      type: item.type,
      uri,
      headers: mergeHeaders(defaultHeaders, item.headers),
      thumbnailUri,
      thumbnailHeaders,
      thumbnailMode: item.thumbnail?.mode,
      blurhash: item.blurhash,
      thumbnailBlurhash: item.thumbnail?.blurhash,
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
