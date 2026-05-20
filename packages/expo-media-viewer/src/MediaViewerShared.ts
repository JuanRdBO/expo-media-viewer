import { Asset } from "expo-asset";
import type { ViewStyle } from "react-native";
import type {
  MediaViewerHeaders,
  MediaViewerProps,
  MediaViewerRenderItemOptions,
  MediaViewerSource,
  MediaViewerThumbnailFit,
  NativeMediaViewerPayload,
  NativeMediaViewerThumbnailAnchor,
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

  if (typeof source === "object" && source && "uri" in source && typeof source.uri === "string") {
    return source.uri;
  }

  if (Array.isArray(source)) {
    const uriSource = source.find((candidate) => candidate && typeof candidate.uri === "string");
    if (uriSource?.uri) {
      return uriSource.uri;
    }
  }

  if (typeof source === "number") {
    const asset = Asset.fromModule(source);
    return asset.localUri ?? asset.uri;
  }

  throw new Error(
    "Unsupported media source. Use a URI string, require(...), or an object with uri.",
  );
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

export function toThumbnailAnchor(
  options: MediaViewerRenderItemOptions,
  contentFit: MediaViewerThumbnailFit,
): NativeMediaViewerThumbnailAnchor {
  const cornerRadius = options.frame?.borderRadius;
  const anchor: NativeMediaViewerThumbnailAnchor = { contentFit };
  if (typeof cornerRadius === "number" && Number.isFinite(cornerRadius) && cornerRadius >= 0) {
    anchor.cornerRadius = cornerRadius;
  }
  return anchor;
}
