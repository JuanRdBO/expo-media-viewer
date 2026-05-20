import {
  type MediaViewerConfig,
  type MediaViewerImageItem,
  type MediaViewerItem,
  type MediaViewerLayoutRenderArgs,
  type MediaViewerVideoItem,
  resolveMediaViewerSource,
} from "../src";

const imageItem = {
  type: "image",
  source: "https://example.com/photo.jpg",
  thumbnail: { mode: "static" },
} satisfies MediaViewerImageItem;

const videoItem = {
  type: "video",
  source: "https://example.com/video.mp4",
  thumbnail: { mode: "loop-muted" },
  duration: "0:18",
} satisfies MediaViewerVideoItem;

const mixedItems = [imageItem, videoItem] satisfies MediaViewerItem[];

const thumbnailModeConfig = {
  thumbnail: { mode: "loop-muted" },
} satisfies MediaViewerConfig;

const legacyThumbnailModeConfig = {
  thumbnail: { videoMode: "loop-muted" },
} satisfies MediaViewerConfig;

const compatibilityConfig = {
  thumbnail: { mode: "loop-muted", videoMode: "static" },
} satisfies MediaViewerConfig;

declare const args: MediaViewerLayoutRenderArgs<MediaViewerVideoItem>;
args.items[0]?.duration?.toUpperCase();

const resolvedUri: string = resolveMediaViewerSource("https://example.com/photo.jpg");

function readVideoDuration(item: MediaViewerItem) {
  if (item.type === "video") {
    const duration: string | undefined = item.duration;
    return duration;
  }

  const duration: undefined = item.duration;
  return duration;
}

const invalidImageItem = {
  type: "image",
  source: "https://example.com/photo.jpg",
  // @ts-expect-error duration belongs to video items only.
  duration: "0:18",
} satisfies MediaViewerImageItem;

void mixedItems;
void thumbnailModeConfig;
void legacyThumbnailModeConfig;
void compatibilityConfig;
void resolvedUri;
void readVideoDuration;
void invalidImageItem;
