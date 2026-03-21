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
  }
>("MediaViewer");

const noop = () => {};

const MediaViewer = Object.assign(
  function MediaViewer({
    children,
    urls,
    theme = "dark",
    mediaTypes,
  }: {
    children: React.ReactNode;
  } & Partial<Pick<MediaViewerContext, "theme" | "urls" | "mediaTypes">>) {
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
        }}
      >
        {children}
      </MediaViewerContext.Provider>
    );
  },
  {
    Image({ edgeToEdge, ...props }: MediaViewerViewProps & { edgeToEdge?: boolean }) {
      const { theme, urls, mediaTypes } = useContext(MediaViewerContext);

      if (__DEV__) {
        controlEdgeToEdgeValues({ edgeToEdge });
      }

      return (
        <NativeMediaViewer
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
