import { type ContextType, createContext } from "react";
import type { Image } from "react-native";
import type { MediaViewerVideoErrorEvent } from "./MediaViewer.types";

type ImageSource = string | Parameters<typeof Image.resolveAssetSource>[0];

export const MediaViewerContext = createContext({
  initialIndex: 0,
  open: false,
  urls: [] as unknown as undefined | ImageSource[],
  setOpen: (
    _info: { open: true; src: string; initialIndex: number; id?: string } | { open: false },
  ) => {},
  theme: "dark" as "dark" | "light",
  src: "",
  hideBlurOverlay: false,
  hidePageIndicators: false,
  mediaTypes: undefined as string[] | undefined,
  posterUrls: undefined as string[] | undefined,
  topTitles: undefined as string[] | undefined,
  topSubtitles: undefined as string[] | undefined,
  bottomTexts: undefined as string[] | undefined,
  onVideoError: undefined as ((event: MediaViewerVideoErrorEvent) => void) | undefined,
});

export type MediaViewerContext = ContextType<typeof MediaViewerContext>;
