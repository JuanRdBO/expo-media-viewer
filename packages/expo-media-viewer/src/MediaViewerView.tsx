/**
 * Cross-platform fallback (web / unresolved platform).
 * On iOS and Android the platform-specific files are picked up automatically
 * by Metro's platform-extension resolution (.ios.tsx / .android.tsx).
 *
 * This file provides the TypeScript type signature for the module and a no-op
 * implementation for environments where neither platform-specific file matches
 * (e.g. tests, web builds).
 */
import type React from "react";
import { MediaViewerContext } from "./context";
import type { MediaViewerVideoErrorEvent, MediaViewerViewProps } from "./MediaViewer.types";

const noop = () => {};

const MediaViewer = Object.assign(
  function MediaViewer({
    children,
    urls,
    theme = "dark",
    mediaTypes,
    posterUrls,
    topTitles,
    topSubtitles,
    bottomTexts,
    onVideoError,
  }: {
    children: React.ReactNode;
    urls?: string[];
    theme?: "dark" | "light";
    mediaTypes?: string[];
    posterUrls?: string[];
    topTitles?: string[];
    topSubtitles?: string[];
    bottomTexts?: string[];
    onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
  }) {
    return (
      <MediaViewerContext.Provider
        value={{
          hideBlurOverlay: false,
          hidePageIndicators: false,
          urls,
          theme,
          initialIndex: 0,
          open: false,
          src: "",
          setOpen: noop,
          mediaTypes,
          posterUrls,
          topTitles,
          topSubtitles,
          bottomTexts,
          onVideoError,
        }}
      >
        {children}
      </MediaViewerContext.Provider>
    );
  },
  {
    Image(props: MediaViewerViewProps) {
      // No-op fallback: just render children without native viewer
      return <>{props.children}</>;
    },
    Popup: (() => null) as React.FC<{
      disableTransition?: "web";
    }>,
  },
);

export { MediaViewer };
export default MediaViewer;
