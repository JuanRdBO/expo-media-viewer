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
import type { MediaViewerViewProps } from "./MediaViewer.types";

const noop = () => {};

const MediaViewer = Object.assign(
  function MediaViewer({
    children,
    urls,
    theme = "dark",
    mediaTypes,
    topTitles,
    topSubtitles,
    bottomTexts,
  }: {
    children: React.ReactNode;
    urls?: string[];
    theme?: "dark" | "light";
    mediaTypes?: string[];
    topTitles?: string[];
    topSubtitles?: string[];
    bottomTexts?: string[];
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
          topTitles,
          topSubtitles,
          bottomTexts,
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
