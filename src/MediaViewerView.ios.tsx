import { requireNativeView } from "expo";
import { useContext } from "react";
import { Image } from "react-native";
import { MediaViewerContext } from "./context";
import type { MediaViewerIndexChangedEvent, MediaViewerViewProps } from "./MediaViewer.types";

const NativeMediaViewer = requireNativeView<
  MediaViewerViewProps & {
    urls?: string[];
    theme: "dark" | "light";
    onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
    mediaTypes?: string[];
    hideBlurOverlay?: boolean;
    hidePageIndicators?: boolean;
    topTitles?: string[];
    topSubtitles?: string[];
    bottomTexts?: string[];
  }
>("MediaViewer");

const noop = () => {};

const MediaViewer = Object.assign(
  function MediaViewer({
    children,
    urls,
    theme = "dark",
    mediaTypes,
    hideBlurOverlay = false,
    hidePageIndicators = false,
    topTitles,
    topSubtitles,
    bottomTexts,
  }: {
    children: React.ReactNode;
  } & Partial<
    Pick<
      MediaViewerContext,
      "theme" | "urls" | "mediaTypes" | "hideBlurOverlay" | "hidePageIndicators" | "topTitles" | "topSubtitles" | "bottomTexts"
    >
  >) {
    return (
      <MediaViewerContext.Provider
        value={{
          urls,
          theme,
          initialIndex: 0,
          open: false,
          src: "",
          setOpen: noop,
          hideBlurOverlay,
          hidePageIndicators,
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
      const { theme, urls, hideBlurOverlay, hidePageIndicators, mediaTypes, topTitles, topSubtitles, bottomTexts } =
        useContext(MediaViewerContext);
      return (
        <NativeMediaViewer
          onIndexChange={props.onIndexChange}
          theme={theme}
          hideBlurOverlay={props.hideBlurOverlay ?? hideBlurOverlay}
          hidePageIndicators={props.hidePageIndicators ?? hidePageIndicators}
          mediaTypes={mediaTypes}
          topTitles={topTitles}
          topSubtitles={topSubtitles}
          bottomTexts={bottomTexts}
          urls={urls?.map((url) => {
            if (typeof url === "string") {
              return url;
            }
            return Image.resolveAssetSource(url).uri;
          })}
          index={props.index ?? 0}
          {...props}
        />
      );
    },
    Popup: (() => null) as React.FC<{
      disableTransition?: "web";
    }>,
  },
);

export { MediaViewer };
export default MediaViewer;
