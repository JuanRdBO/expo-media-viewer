import { Image } from "react-native";

const pic = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const SAMPLE_VIDEO_SHORT =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const SAMPLE_VIDEO_MOVIE = "https://www.w3schools.com/html/movie.mp4";
const SAMPLE_VIDEO_BUNNY = "https://www.w3schools.com/html/mov_bbb.mp4";
const SAMPLE_VIDEO_LIB_5 = "https://samplelib.com/mp4/sample-5s-360p.mp4";
const SAMPLE_VIDEO_LIB_10 = "https://samplelib.com/mp4/sample-10s-360p.mp4";
const SAMPLE_VIDEO_LIB_15 = "https://samplelib.com/mp4/sample-15s-360p.mp4";
const SAMPLE_VIDEO_LIB_20 = "https://samplelib.com/mp4/sample-20s-360p.mp4";
const SAMPLE_VIDEO_LIB_30 = "https://samplelib.com/mp4/sample-30s-360p.mp4";

const FLOWER_POSTER = Image.resolveAssetSource(
  require("../../assets/posters/flower-poster.png"),
).uri;
const MOVIE_POSTER = Image.resolveAssetSource(
  require("../../assets/posters/movie-poster.png"),
).uri;
const MOV_BBB_POSTER = Image.resolveAssetSource(
  require("../../assets/posters/mov-bbb-poster.png"),
).uri;
const SAMPLE_VIDEO_LIB_5_POSTER = "https://samplelib.com/preview/mp4/sample-5s.jpg";
const SAMPLE_VIDEO_LIB_10_POSTER = "https://samplelib.com/preview/mp4/sample-10s.jpg";
const SAMPLE_VIDEO_LIB_15_POSTER = "https://samplelib.com/preview/mp4/sample-15s.jpg";
const SAMPLE_VIDEO_LIB_20_POSTER = "https://samplelib.com/preview/mp4/sample-20s.jpg";
const SAMPLE_VIDEO_LIB_30_POSTER = "https://samplelib.com/preview/mp4/sample-30s.jpg";

export type MediaKind = "image" | "video";
export type MediaItem = {
  type: MediaKind;
  url: string;
  poster?: string;
  duration?: string;
};

export type Memory = {
  id: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
};

type VideoSample = MediaItem & { type: "video"; poster: string; duration: string };

const video = (url: string, poster: string, duration: string): VideoSample => ({
  type: "video",
  url,
  poster,
  duration,
});

const BEACH_VIDEO = video(SAMPLE_VIDEO_SHORT, FLOWER_POSTER, "0:05");
const HIKE_VIDEO = video(SAMPLE_VIDEO_MOVIE, MOVIE_POSTER, "0:12");
const CITY_VIDEO = video(SAMPLE_VIDEO_BUNNY, MOV_BBB_POSTER, "0:10");
const STAY_VIDEO = video(SAMPLE_VIDEO_LIB_5, SAMPLE_VIDEO_LIB_5_POSTER, "0:05");
const APRIL_VIDEO_A = video(SAMPLE_VIDEO_LIB_10, SAMPLE_VIDEO_LIB_10_POSTER, "0:10");
const APRIL_VIDEO_B = video(SAMPLE_VIDEO_LIB_15, SAMPLE_VIDEO_LIB_15_POSTER, "0:15");
const MARCH_VIDEO = video(SAMPLE_VIDEO_LIB_20, SAMPLE_VIDEO_LIB_20_POSTER, "0:20");
const FEB_VIDEO = video(SAMPLE_VIDEO_LIB_30, SAMPLE_VIDEO_LIB_30_POSTER, "0:30");

export const MEMORIES: Memory[] = [
  {
    id: "beach",
    title: "Beach day",
    subtitle: "Jul 2025 · Nazaré",
    items: [
      { type: "image", url: pic("beach-a") },
      { type: "image", url: pic("beach-b") },
      { type: "image", url: pic("beach-c") },
      { type: "image", url: pic("beach-d") },
      BEACH_VIDEO,
    ],
  },
  {
    id: "hike",
    title: "Mountain hike",
    subtitle: "Aug 2025 · Serra da Estrela",
    items: [
      { type: "image", url: pic("hike-a") },
      HIKE_VIDEO,
    ],
  },
  {
    id: "city-run",
    title: "City run",
    subtitle: "Sep 2025 · Lisbon",
    items: [
      CITY_VIDEO,
      { type: "image", url: pic("city-a") },
      { type: "image", url: pic("city-b") },
    ],
  },
  {
    id: "late-checkout",
    title: "Late checkout",
    subtitle: "Oct 2025 · Porto",
    items: [
      { type: "image", url: pic("stay-a") },
      { type: "image", url: pic("stay-b") },
      STAY_VIDEO,
      { type: "image", url: pic("stay-c") },
    ],
  },
  {
    id: "golden",
    title: "Golden hour",
    subtitle: "Sep 2025 · Lisbon",
    items: [{ type: "image", url: pic("golden-a", 1200, 1600) }],
  },
];

export type CircleSection = {
  id: string;
  title: string;
  items: MediaItem[];
};

const section = (
  id: string,
  title: string,
  count: number,
  videoItems: Record<number, VideoSample> = {},
): CircleSection => ({
  id,
  title,
  items: Array.from({ length: count }, (_, i) => {
    const videoItem = videoItems[i];
    if (videoItem) {
      return videoItem;
    }

    return {
      type: "image",
      url: pic(`${id}-${i}`, 800, 800),
    };
  }),
});

export const CIRCLE_SECTIONS: CircleSection[] = [
  section("apr2026", "April 2026", 9, { 2: APRIL_VIDEO_A, 7: APRIL_VIDEO_B }),
  section("mar2026", "March 2026", 6, { 4: MARCH_VIDEO }),
  section("feb2026", "February 2026", 12, { 8: FEB_VIDEO }),
];
