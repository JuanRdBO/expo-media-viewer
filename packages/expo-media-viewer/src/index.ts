import { requireNativeModule } from "expo";
import { Platform } from "react-native";

export type {
  MediaViewerBlurhash,
  MediaViewerConfig,
  MediaViewerFrameConfig,
  MediaViewerHeaders,
  MediaViewerImageItem,
  MediaViewerIndexChangedEvent,
  MediaViewerItem,
  MediaViewerItemChrome,
  MediaViewerLayoutRenderArgs,
  MediaViewerMediaType,
  MediaViewerOverlayRenderArgs,
  MediaViewerProps,
  MediaViewerRenderItem,
  MediaViewerRenderItemOptions,
  MediaViewerRenderLayout,
  MediaViewerRenderOverlay,
  MediaViewerSource,
  MediaViewerThumbnail,
  MediaViewerThumbnailConfig,
  MediaViewerThumbnailFit,
  MediaViewerThumbnailMode,
  MediaViewerVideoErrorEvent,
  MediaViewerVideoItem,
  MediaViewerVideoPlaybackStage,
} from "./MediaViewer.types";
export { resolveMediaViewerSource } from "./MediaViewerShared";
export { MediaViewer } from "./MediaViewerView";

// Native module functions (Android only)
const NativeModule = Platform.OS === "android" ? requireNativeModule("MediaViewer") : null;

/**
 * Read GPS coordinates from a photo on Android.
 * Tries assetId first, then queries MediaStore by filename.
 * Uses MediaStore.setRequireOriginal() to bypass scoped storage GPS stripping.
 * Returns { latitude, longitude } or null.
 */
export async function readGpsFromPhoto(
  assetId: string | null,
  fileName: string | null,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!NativeModule) return null;
  try {
    return await NativeModule.readGpsFromPhoto(assetId, fileName);
  } catch {
    return null;
  }
}
