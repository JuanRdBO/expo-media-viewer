import { requireNativeView } from "expo";
import { useContext } from "react";
import { Image } from "react-native";
import { MediaViewerContext } from "./context";
import type {
  MediaViewerIndexChangedEvent,
  MediaViewerVideoErrorEvent,
  MediaViewerViewProps,
} from "./MediaViewer.types";

const NativeMediaViewer = requireNativeView<
  MediaViewerViewProps & {
    urls?: string[];
    theme: "dark" | "light";
    onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
    onVideoError?: (event: MediaViewerVideoErrorEvent) => void;
    mediaTypes?: string[];
    posterUrls?: string[];
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
    posterUrls,
    hideBlurOverlay = false,
    hidePageIndicators = false,
    topTitles,
    topSubtitles,
    bottomTexts,
    onVideoError,
  }: {
    children: React.ReactNode;
  } & Partial<
    Pick<
      MediaViewerContext,
      | "theme"
      | "urls"
      | "mediaTypes"
      | "posterUrls"
      | "hideBlurOverlay"
      | "hidePageIndicators"
      | "topTitles"
      | "topSubtitles"
      | "bottomTexts"
      | "onVideoError"
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
      const {
        theme,
        urls,
        hideBlurOverlay,
        hidePageIndicators,
        mediaTypes,
        posterUrls,
        topTitles,
        topSubtitles,
        bottomTexts,
        onVideoError,
      } = useContext(MediaViewerContext);
      const resolvedUrls = urls?.map((url) => {
        if (typeof url === "string") {
          return url;
        }
        return Image.resolveAssetSource(url).uri;
      });

      return (
        <NativeMediaViewer
          {...props}
          onIndexChange={props.onIndexChange}
          onVideoError={props.onVideoError ?? onVideoError}
          theme={theme}
          hideBlurOverlay={props.hideBlurOverlay ?? hideBlurOverlay}
          hidePageIndicators={props.hidePageIndicators ?? hidePageIndicators}
          mediaTypes={mediaTypes}
          posterUrls={posterUrls}
          topTitles={topTitles}
          topSubtitles={topSubtitles}
          bottomTexts={bottomTexts}
          urls={resolvedUrls}
          index={props.index ?? 0}
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
