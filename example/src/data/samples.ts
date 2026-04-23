import { Image } from "react-native";

const pic = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const resolvePoster = (asset: number) => Image.resolveAssetSource(asset).uri;

const VECTEEZY_VIDEOS = {
  soapBubbles: {
    url: "https://static.vecteezy.com/system/resources/previews/003/650/568/mp4/young-asian-woman-playing-soap-bubbles-and-having-fun-outdoors-at-a-public-park-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-soap-bubbles.jpg")),
    duration: "0:14",
  },
  streetStretch: {
    url: "https://static.vecteezy.com/system/resources/previews/001/790/505/mp4/asian-woman-stretching-for-running-and-jogging-on-the-street-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-street-stretch.jpg")),
    duration: "0:17",
  },
  crosswalk: {
    url: "https://static.vecteezy.com/system/resources/previews/022/570/879/mp4/people-crossing-street-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-crosswalk.jpg")),
    duration: "0:25",
  },
  runnerNature: {
    url: "https://static.vecteezy.com/system/resources/previews/042/199/893/mp4/athletic-runner-doing-stretching-exercise-preparing-for-running-in-the-nature-with-the-city-in-background-healthy-lifestyle-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-runner-nature.jpg")),
    duration: "0:06",
  },
  skater: {
    url: "https://static.vecteezy.com/system/resources/previews/001/799/872/mp4/bearded-man-skating-in-the-alley-with-carriage-in-background-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-skater.jpg")),
    duration: "0:40",
  },
  horseFarm: {
    url: "https://static.vecteezy.com/system/resources/previews/022/658/857/mp4/little-asian-girl-is-stroking-the-horse-s-hair-in-the-farm-free-video.mp4",
    poster: resolvePoster(require("../../assets/posters/vecteezy-horse-farm.jpg")),
    duration: "0:14",
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

const BUBBLES_VIDEO = video(VECTEEZY_VIDEOS.soapBubbles);
const STREET_VIDEO = video(VECTEEZY_VIDEOS.streetStretch);
const CROSSWALK_VIDEO = video(VECTEEZY_VIDEOS.crosswalk);
const RUNNER_VIDEO = video(VECTEEZY_VIDEOS.runnerNature);
const SKATER_VIDEO = video(VECTEEZY_VIDEOS.skater);
const HORSE_VIDEO = video(VECTEEZY_VIDEOS.horseFarm);

export const MEMORIES: Memory[] = [
  {
    id: "bubble-break",
    title: "Bubble break",
    subtitle: "Jul 2025 · Public park",
    items: [
      { type: "image", url: pic("bubble-break-a") },
      { type: "image", url: pic("bubble-break-b") },
      { type: "image", url: pic("bubble-break-c") },
      { type: "image", url: pic("bubble-break-d") },
      BUBBLES_VIDEO,
    ],
  },
  {
    id: "pre-run-stretch",
    title: "Pre-run stretch",
    subtitle: "Aug 2025 · Neighborhood streets",
    items: [
      { type: "image", url: pic("pre-run-stretch-a") },
      STREET_VIDEO,
    ],
  },
  {
    id: "crosswalk-rush",
    title: "Crosswalk rush",
    subtitle: "Sep 2025 · Downtown",
    items: [
      CROSSWALK_VIDEO,
      { type: "image", url: pic("crosswalk-rush-a") },
      { type: "image", url: pic("crosswalk-rush-b") },
    ],
  },
  {
    id: "alley-skate",
    title: "Alley skate",
    subtitle: "Oct 2025 · Old quarter",
    items: [
      { type: "image", url: pic("alley-skate-a") },
      { type: "image", url: pic("alley-skate-b") },
      SKATER_VIDEO,
      { type: "image", url: pic("alley-skate-c") },
    ],
  },
  {
    id: "stable-visit",
    title: "Stable visit",
    subtitle: "Nov 2025 · Family farm",
    items: [HORSE_VIDEO],
  },
  {
    id: "trail-warmup",
    title: "Trail warm-up",
    subtitle: "Dec 2025 · City overlook",
    items: [RUNNER_VIDEO],
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
  section("apr2026", "April 2026", 9, { 2: RUNNER_VIDEO, 7: BUBBLES_VIDEO }),
  section("mar2026", "March 2026", 6, { 4: CROSSWALK_VIDEO }),
  section("feb2026", "February 2026", 12, { 3: STREET_VIDEO, 8: SKATER_VIDEO, 10: HORSE_VIDEO }),
];
