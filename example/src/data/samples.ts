const pic = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export type MediaKind = "image" | "video";
export type MediaItem = { type: MediaKind; url: string };

export type Memory = {
  id: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
};

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
      { type: "video", url: SAMPLE_VIDEO },
    ],
  },
  {
    id: "hike",
    title: "Mountain hike",
    subtitle: "Aug 2025 · Serra da Estrela",
    items: [
      { type: "image", url: pic("hike-a") },
      { type: "image", url: pic("hike-b") },
    ],
  },
  {
    id: "golden",
    title: "Golden hour",
    subtitle: "Sep 2025 · Lisbon",
    items: [{ type: "image", url: pic("golden-a", 1200, 1600) }],
  },
];

export const FEED_POST = {
  title: "Weekend in Porto",
  subtitle: "Vila Nova de Gaia · 2026-04-18",
  items: [
    { type: "image", url: pic("porto-1") },
    { type: "image", url: pic("porto-2") },
    { type: "image", url: pic("porto-3") },
    { type: "image", url: pic("porto-4") },
    { type: "image", url: pic("porto-5") },
  ] satisfies MediaItem[],
};

export type CircleSection = {
  id: string;
  title: string;
  items: MediaItem[];
};

const section = (id: string, title: string, count: number): CircleSection => ({
  id,
  title,
  items: Array.from({ length: count }, (_, i) => ({
    type: "image" as const,
    url: pic(`${id}-${i}`, 800, 800),
  })),
});

export const CIRCLE_SECTIONS: CircleSection[] = [
  section("apr2026", "April 2026", 9),
  section("mar2026", "March 2026", 6),
  section("feb2026", "February 2026", 12),
];
