import type { MediaViewerVideoErrorEvent } from "expo-media-viewer";

export function logMediaViewerVideoError(scope: string) {
  return (event: MediaViewerVideoErrorEvent) => {
    const { index, url, message, nativeMessage, underlyingMessage, stage } = event.nativeEvent;

    console.error(`[expo-media-viewer-example][${scope}] video load failed`, {
      index,
      url,
      stage,
      message,
      nativeMessage,
      underlyingMessage,
    });
  };
}
