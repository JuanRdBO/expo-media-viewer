import { requireNativeView } from "expo";
import { useContext } from "react";
import { Image } from "react-native";
import { controlEdgeToEdgeValues, isEdgeToEdge } from "react-native-is-edge-to-edge";
import { MediaViewerContext } from "./context";
import type { MediaViewerIndexChangedEvent, MediaViewerViewProps } from "./MediaViewer.types";

const EDGE_TO_EDGE = isEdgeToEdge();

const NativeMediaViewer = requireNativeView<
  MediaViewerViewProps & {
    edgeToEdge: boolean;
    urls?: string[];
    theme: "dark" | "light";
    onIndexChange?: (event: MediaViewerIndexChangedEvent) => void;
    mediaTypes?: string[];
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
    topTitles,
    topSubtitles,
    bottomTexts,
  }: {
    children: React.ReactNode;
  } & Partial<
    Pick<
      MediaViewerContext,
      "theme" | "urls" | "mediaTypes" | "topTitles" | "topSubtitles" | "bottomTexts"
    >
  >) {
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
    Image({ edgeToEdge, ...props }: MediaViewerViewProps & { edgeToEdge?: boolean }) {
      const { theme, urls, mediaTypes, topTitles, topSubtitles, bottomTexts } =
        useContext(MediaViewerContext);

      if (__DEV__) {
        controlEdgeToEdgeValues({ edgeToEdge });
      }

      return (
        <NativeMediaViewer
          {...props}
          onIndexChange={props.onIndexChange}
          edgeToEdge={EDGE_TO_EDGE || (edgeToEdge ?? false)}
          theme={theme}
          urls={urls?.map((url) => {
            if (typeof url === "string") {
              return url;
            }
            return Image.resolveAssetSource(url).uri;
          })}
          mediaTypes={mediaTypes}
          topTitles={topTitles}
          topSubtitles={topSubtitles}
          bottomTexts={bottomTexts}
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
