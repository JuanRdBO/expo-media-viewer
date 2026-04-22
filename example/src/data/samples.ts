import { Image } from "react-native";

const pic = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const resolvePoster = (asset: number) => Image.resolveAssetSource(asset).uri;

const VECTEEZY_VIDEOS = {
  archaeologist: {
    url: "https://static.vecteezy.com/system/resources/previews/071/931/109/mp4/an-archaeologist-working-at-an-excavation-site-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-archaeologist.jpg")),
    duration: "0:08",
  },
  felt: {
    url: "https://static.vecteezy.com/system/resources/previews/025/072/879/mp4/green-felt-fabric-background-closeup-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-felt.jpg")),
    duration: "0:21",
  },
  cityTraffic: {
    url: "https://static.vecteezy.com/system/resources/previews/057/381/765/mp4/timelapse-city-traffic-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-city-traffic.jpg")),
    duration: "0:21",
  },
  coffeeSketch: {
    url: "https://static.vecteezy.com/system/resources/previews/030/187/296/mp4/animated-of-a-sketch-of-the-shape-of-a-cup-of-coffee-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-coffee.jpg")),
    duration: "0:08",
  },
  beach: {
    url: "https://static.vecteezy.com/system/resources/previews/048/207/448/mp4/a-serene-beach-with-gentle-waves-and-a-clear-blue-sky-soft-natural-lighting-to-create-a-relaxing-atmosphere-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-beach.jpg")),
    duration: "0:11",
  },
  sunrise: {
    url: "https://static.vecteezy.com/system/resources/previews/011/731/093/mp4/aerial-view-of-beautiful-sunrise-sky-with-clouds-on-a-summer-day-time-lapse-of-clouds-above-the-golden-sky-with-the-sun-shining-sky-nature-background-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-sunrise.jpg")),
    duration: "0:12",
  },
  tropicalRoad: {
    url: "https://static.vecteezy.com/system/resources/previews/055/826/913/mp4/a-scenic-aerial-shot-of-a-road-curving-through-a-lush-green-tropical-landscape-abundant-with-palm-trees-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-road.jpg")),
    duration: "0:25",
  },
  trainSunset: {
    url: "https://static.vecteezy.com/system/resources/previews/075/531/491/mp4/interior-view-of-a-train-carriage-with-windows-framing-a-golden-sunset-over-fields-and-rolling-hills-creating-a-tranquil-travel-atmosphere-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-train.jpg")),
    duration: "0:05",
  },
} as const;

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
type VideoDescriptor = (typeof VECTEEZY_VIDEOS)[keyof typeof VECTEEZY_VIDEOS];

const video = ({ url, poster, duration }: VideoDescriptor): VideoSample => ({
  type: "video",
  url,
  poster,
  duration,
});

const BEACH_VIDEO = video(VECTEEZY_VIDEOS.beach);
const HIKE_VIDEO = video(VECTEEZY_VIDEOS.tropicalRoad);
const CITY_VIDEO = video(VECTEEZY_VIDEOS.cityTraffic);
const STAY_VIDEO = video(VECTEEZY_VIDEOS.trainSunset);
const APRIL_VIDEO_A = video(VECTEEZY_VIDEOS.archaeologist);
const APRIL_VIDEO_B = video(VECTEEZY_VIDEOS.coffeeSketch);
const MARCH_VIDEO = video(VECTEEZY_VIDEOS.sunrise);
const FEB_VIDEO = video(VECTEEZY_VIDEOS.felt);

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
